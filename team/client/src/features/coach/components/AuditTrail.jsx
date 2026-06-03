import { useState } from 'react';

const ACTION_LABELS = {
  COACH_TASK_ACCEPTED: { label: 'Accepted', color: 'bg-green-100 text-green-700' },
  COACH_TASK_REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  COACH_TASK_COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  COACH_TASK_SKIPPED: { label: 'Skipped', color: 'bg-amber-100 text-amber-700' },
  COACH_TASK_COMPLETED_RESPONSE: { label: 'Responded', color: 'bg-blue-100 text-blue-700' },
  COACH_FEEDBACK_SUBMITTED: { label: 'Feedback', color: 'bg-purple-100 text-purple-700' },
  COACH_CHAT_MESSAGE: { label: 'Chat', color: 'bg-sky-100 text-sky-700' },
  COACH_CHAT_RESPONDED: { label: 'Responded', color: 'bg-indigo-100 text-indigo-700' },
  COACH_PLAN_GENERATED: { label: 'Plan', color: 'bg-violet-100 text-violet-700' },
  COACH_LLM_CALL: { label: 'LLM Call', color: 'bg-rose-100 text-rose-700' },
  COACH_LLM_ERROR: { label: 'LLM Error', color: 'bg-red-200 text-red-800' },
  COACH_STATIC_FEEDBACK: { label: 'Static Feedback', color: 'bg-purple-100 text-purple-700' },
  COACH_STATIC_SKIP: { label: 'Static Skip', color: 'bg-amber-100 text-amber-700' },
  COACH_STATIC_CHECKIN: { label: 'Static Check-in', color: 'bg-sky-100 text-sky-700' },
  COACH_PROPOSAL_ACCEPTED: { label: 'Proposal Accepted', color: 'bg-emerald-100 text-emerald-700' },
  COACH_PLAN_UNDONE: { label: 'Plan Undone', color: 'bg-orange-100 text-orange-700' },
};

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const ACTION_KEYS = Object.keys(ACTION_LABELS);

export default function AuditTrail({ logs, actionCounts }) {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');

  if (!logs || logs.length === 0) {
    return <p className="text-xs text-primary-400 italic">Belum ada catatan audit.</p>;
  }

  const entries = Array.isArray(logs) ? logs : [];

  const filtered = entries.filter((log) => {
    if (filterAction && log.action !== filterAction) return false;
    if (search) {
      const q = search.toLowerCase();
      const meta = ACTION_LABELS[log.action]?.label || '';
      const preview = log.metadata?.message_preview || log.metadata?.task_title || log.metadata?.reason || '';
      if (!meta.toLowerCase().includes(q) && !preview.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari aksi..."
          className="flex-1 text-[10px] px-2 py-1.5 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
        />
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="text-[10px] px-2 py-1.5 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
        >
          <option value="">Semua</option>
          {Object.entries(ACTION_LABELS).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
      </div>

      {actionCounts && Object.keys(actionCounts).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {Object.entries(actionCounts).map(([action, count]) => {
            const meta = ACTION_LABELS[action] || { label: action.replace('COACH_', ''), color: 'bg-gray-100 text-gray-700' };
            const isActive = filterAction === action;
            return (
              <button
                key={action}
                onClick={() => setFilterAction(isActive ? '' : action)}
                className={`text-[9px] px-2 py-0.5 rounded-full font-medium transition-all ${meta.color} ${isActive ? 'ring-2 ring-primary-400' : 'opacity-70 hover:opacity-100'}`}
              >
                {meta.label} {count}
              </button>
            );
          })}
        </div>
      )}

      <div className="space-y-1 max-h-64 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-[10px] text-primary-400 italic text-center py-4">Tidak ada record yang cocok.</p>
        ) : (
          filtered.map((log) => {
            const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600' };
            const preview = log.metadata?.message_preview || log.metadata?.task_title || log.metadata?.reason || '';
            const rationaleFactors = log.metadata?.rationale_factors;
            return (
              <div key={log.id} className="flex items-start gap-2 text-[10px] py-1.5 px-2.5 bg-primary-50/50 rounded-lg hover:bg-primary-50 transition-colors">
                <span className={`shrink-0 px-1.5 py-0.5 rounded font-medium ${meta.color}`}>
                  {meta.label}
                </span>
                <span className="flex-1 text-primary-600 truncate min-w-0">
                  {preview}
                  {rationaleFactors && rationaleFactors.length > 0 && (
                    <span className="text-[9px] text-primary-400 ml-1">
                      ({rationaleFactors.length} factor{rationaleFactors.length > 1 ? 's' : ''})
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-primary-300 font-mono">{formatTime(log.created_at)}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
