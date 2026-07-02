import { useState } from 'react';
import { useCoach } from '../features/coach/hooks/useCoach';
import { useGoals } from '../features/goals/hooks/useGoals';

const QUICK_ACTIONS = [
  { type: 'less_work', icon: '🔽', label: 'Kurangi Beban' },
  { type: 'more_challenge', icon: '🔼', label: 'Tingkatkan Tantangan' },
  { type: 'change_focus', icon: '🔀', label: 'Ganti Fokus' },
  { type: 'shift_dates', icon: '📅', label: 'Geser Jadwal' },
];

export default function AdjustmentPanel({ onRequestAdjustment }) {
  const { dispatchTaskAction } = useCoach();
  const { goals } = useGoals();
  const activeGoalId = goals?.[0]?.id || null;
  const activeGoalName = goals?.[0]?.title || 'goal';
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [focusModal, setFocusModal] = useState(false);
  const [focusInput, setFocusInput] = useState('');

  const buildPayload = (type, message) => ({
    type,
    message,
    ...(activeGoalId ? { goal_id: activeGoalId } : {}),
  });

  const handleQuickAction = async (type) => {
    if (type === 'change_focus') {
      setFocusInput('');
      setFocusModal(true);
      return;
    }
    setSending(true);
    try {
      if (onRequestAdjustment) {
        onRequestAdjustment(type, null);
      } else {
        await dispatchTaskAction('REQUEST_ADJUSTMENT', buildPayload(type, null));
      }
    } finally {
      setSending(false);
    }
  };

  const handleFocusSubmit = async () => {
    if (!focusInput.trim() || sending) return;
    setFocusModal(false);
    setSending(true);
    try {
      if (onRequestAdjustment) {
        onRequestAdjustment('change_focus', focusInput.trim());
      } else {
        await dispatchTaskAction('REQUEST_ADJUSTMENT', buildPayload('change_focus', focusInput.trim()));
      }
    } finally {
      setSending(false);
      setFocusInput('');
    }
  };

  const handleCustomSend = async () => {
    if (!customMessage.trim() || sending) return;
    setSending(true);
    try {
      if (onRequestAdjustment) {
        onRequestAdjustment('custom', customMessage.trim());
      } else {
        await dispatchTaskAction('REQUEST_ADJUSTMENT', buildPayload('custom', customMessage.trim()));
      }
      setCustomMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-primary-500 uppercase tracking-wide mb-3">
        Pengaturan Cepat
      </p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.type}
            type="button"
            onClick={() => handleQuickAction(action.type)}
            disabled={sending}
            className="flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-medium border-2 border-dashed border-primary-200 text-primary-600 hover:border-accent-400 hover:bg-accent-50 hover:text-accent-700 transition-all disabled:opacity-50"
          >
            <span className="text-base">{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSend(); }}
          placeholder="Tulis permintaan kustom..."
          disabled={sending}
          className="input flex-1 !py-2 !text-sm !rounded-xl disabled:opacity-50"
          aria-label="Tulis permintaan penyesuaian"
        />
        <button
          onClick={handleCustomSend}
          disabled={!customMessage.trim() || sending}
          className="btn-primary !px-4 !py-2 !rounded-xl disabled:opacity-50"
          aria-label="Kirim permintaan"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      {focusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-primary-700 mb-2">Ganti Fokus</h3>
            <p className="text-sm text-primary-500 mb-4">
              Apa fokus anda saat ini terhadap <span className="font-medium text-primary-700">{activeGoalName}</span>?
            </p>
            <textarea
              value={focusInput}
              onChange={(e) => setFocusInput(e.target.value)}
              placeholder="Contoh: saya ingin fokus ke latihan soal PG..."
              className="input w-full !py-2 !text-sm !rounded-xl mb-4 resize-none"
              rows={3}
              aria-label="Fokus baru"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setFocusModal(false); setFocusInput(''); }}
                className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-800 rounded-xl hover:bg-primary-50 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleFocusSubmit}
                disabled={!focusInput.trim()}
                className="btn-primary !px-4 !py-2 !rounded-xl disabled:opacity-50"
              >
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
