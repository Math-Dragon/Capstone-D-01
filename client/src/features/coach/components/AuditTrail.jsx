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
};

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function AuditTrail({ logs, actionCounts }) {
  if (!logs || logs.length === 0) {
    return <p className="text-xs text-primary-400 italic">No audit records yet.</p>;
  }

  const entries = Array.isArray(logs) ? logs : [];

  return (
    <div className="space-y-1.5">
      {actionCounts && Object.keys(actionCounts).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {Object.entries(actionCounts).map(([action, count]) => {
            const meta = ACTION_LABELS[action] || { label: action.replace('COACH_', ''), color: 'bg-gray-100 text-gray-700' };
            return (
              <span key={action} className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
                {meta.label} {count}
              </span>
            );
          })}
        </div>
      )}
      <div className="space-y-1 max-h-64 overflow-auto">
        {entries.map((log) => {
          const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-600' };
          const preview = log.metadata?.message_preview || log.metadata?.task_title || log.metadata?.reason || '';
          return (
            <div key={log.id} className="flex items-start gap-2 text-[10px] py-1 px-2 bg-primary-50/50 rounded-lg">
              <span className={`shrink-0 px-1.5 py-0.5 rounded font-medium ${meta.color}`}>
                {meta.label}
              </span>
              <span className="flex-1 text-primary-600 truncate">
                {preview}
              </span>
              <span className="shrink-0 text-primary-300 font-mono">{formatTime(log.created_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
