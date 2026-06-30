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
  const [customMessage, setCustomMessage] = useState('');
  const [sending, setSending] = useState(false);

  const buildPayload = (type, message) => ({
    type,
    message,
    ...(activeGoalId ? { goal_id: activeGoalId } : {}),
  });

  const handleQuickAction = async (type) => {
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
    </div>
  );
}
