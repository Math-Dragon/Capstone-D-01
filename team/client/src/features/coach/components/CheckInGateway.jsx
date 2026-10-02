import { useState, useEffect, useRef } from 'react';
import useFocusTrap from '../../../hooks/useFocusTrap';
import { useCoach } from '../hooks/useCoach';
import { toDateKey } from '../../../utils/helpers';
import progressService from '../../progress/services/progressService';

const MOODS = [
  { value: 'great', emoji: '🔥', label: 'Bersemangat' },
  { value: 'good', emoji: '😊', label: 'Baik' },
  { value: 'okay', emoji: '🙂', label: 'Biasa Aja' },
  { value: 'struggling', emoji: '😔', label: 'Kurang Baik' },
  { value: 'overwhelmed', emoji: '😰', label: 'Kewalahan' },
  { value: 'drained', emoji: '😩', label: 'Lelah' },
];

const APP_VERSION = '1.0.0';
const EVENT_ERROR_MESSAGE = 'Gagal menyimpan. Coba lagi.';

function getToday() {
  return toDateKey(new Date());
}

// Kontrak BE (createEventSchema) meminta `client_timestamp` sebagai ISO datetime string.
function buildEvent(payload) {
  return {
    client_event_id: progressService.newClientEventId(),
    source: 'daily_gateway',
    client_timestamp: new Date().toISOString(),
    app_version: APP_VERSION,
    ...payload,
  };
}

function markCheckedIn() {
  try {
    localStorage.setItem('lastCheckIn', getToday());
  } catch (error) {
    void error;
  }
}

export default function CheckInGateway({ children }) {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const { handleCheckIn } = useCoach();
  const checkinRef = useRef(null);
  useFocusTrap(checkinRef, showCheckIn);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setShowCheckIn(false);
      return;
    }
    try {
      const lastCheckIn = localStorage.getItem('lastCheckIn');
      if (lastCheckIn === getToday()) {
        setShowCheckIn(false);
        return;
      }
    } catch {
      // localStorage unavailable
    }
    setShowCheckIn(true);
  }, []);

  const handleSubmit = async () => {
    if (!selectedMood || isLoading) return;
    setIsLoading(true);
    setSubmitError(null);
    try {
      await handleCheckIn(selectedMood);
    } catch {
      // Coach statis gagal: dicatat sebagai catatan non-blocking, tidak menghalangi event.
    }
    try {
      await progressService.createEvent(
        buildEvent({ event_type: 'submitted', mood: selectedMood }),
      );
      markCheckedIn();
      setShowCheckIn(false);
    } catch {
      // Keep the dialog open so the check-in can be retried.
      setSubmitError(EVENT_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (isLoading) return;
    setSubmitError(null);
    setIsLoading(true);
    try {
      await progressService.createEvent(buildEvent({ event_type: 'skipped' }));
      markCheckedIn();
      setShowCheckIn(false);
    } catch {
      // Stay open so the user can retry; the day stays unmarked.
      setSubmitError(EVENT_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  if (!showCheckIn) {
    return <>{children}</>;
  }

  return (
    <div
      ref={checkinRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-title"
    >
      <div className="max-w-sm w-full mx-4 text-center">
        <div className="text-5xl mb-4">👋</div>
        <h2 id="checkin-title" className="text-xl font-bold text-primary-900 mb-2">
          Hai, bagaimana perasaanmu hari ini?
        </h2>
        <p className="text-sm text-primary-400 mb-8">
          Pilih suasana hatimu supaya rencana belajar bisa menyesuaikan
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3" role="group" aria-label="Pilih suasana hati">
          {MOODS.map(({ value, emoji, label }) => (
            <button
              key={value}
              onClick={() => setSelectedMood(value)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                selectedMood === value 
                  ? 'bg-primary-100 border-primary-500 shadow-sm' 
                  : 'bg-primary-50 hover:bg-primary-100 border-primary-100 hover:border-primary-300'
              }`}
              aria-label={label}
              aria-pressed={selectedMood === value}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-[10px] text-primary-600 font-medium">{label}</span>
            </button>
          ))}
        </div>

        {submitError ? (
          <p role="alert" className="mt-4 text-xs text-red-600">
            {submitError}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          <button 
            onClick={handleSubmit} 
            disabled={!selectedMood || isLoading}
            className="w-full py-3 px-4 bg-primary-900 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-800 transition-colors"
          >
            {isLoading ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button 
            onClick={handleSkip} 
            disabled={isLoading}
            className="text-xs font-medium text-primary-500 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Lewati
          </button>
        </div>
      </div>
    </div>
  );
}
