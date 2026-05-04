import { useState, useEffect, useCallback, useRef } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';
import { useCoach } from '../features/coach/hooks/useCoach';

const MOODS = [
  { value: 'great', emoji: '🔥', label: 'Bersemangat' },
  { value: 'good', emoji: '😊', label: 'Baik' },
  { value: 'okay', emoji: '🙂', label: 'Biasa Aja' },
  { value: 'down', emoji: '😔', label: 'Kurang Baik' },
  { value: 'drained', emoji: '😩', label: 'Lelah' },
];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function CheckInGateway({ children }) {
  const [showCheckIn, setShowCheckIn] = useState(false);
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

  const handleMoodSelect = useCallback(async (mood) => {
    await handleCheckIn(mood);
    try {
      localStorage.setItem('lastCheckIn', getToday());
    } catch {
      // localStorage unavailable
    }
    setShowCheckIn(false);
  }, [handleCheckIn]);

  if (!showCheckIn) return children;

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
          Beri tahu Coach agar bisa menyesuaikan rencana belajarmu
        </p>
        <div className="grid grid-cols-5 gap-3" role="group" aria-label="Pilih suasana hati">
          {MOODS.map(({ value, emoji, label }) => (
            <button
              key={value}
              onClick={() => handleMoodSelect(value)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-primary-50 hover:bg-primary-100 border border-primary-100 hover:border-primary-300 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label={label}
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-[10px] text-primary-600 font-medium">{label}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-primary-300 mt-6" aria-live="polite">
          Pilih suasana hatimu untuk melanjutkan
        </p>
      </div>
    </div>
  );
}
