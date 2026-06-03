function MetricRow({ label, value, highlight, bar }) {
  const numVal = typeof value === 'number' ? value : NaN;
  const displayValue = !isNaN(numVal)
    ? (numVal < 1 && numVal > 0 ? (numVal * 100).toFixed(0) + '%' : String(numVal))
    : (value ?? 'n/a');

  return (
    <div className={`flex justify-between items-center text-[10px] p-2 rounded gap-2 ${highlight ? 'bg-primary-100/60' : 'bg-primary-50'}`}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <code className="text-primary-500 truncate">{label}</code>
        {bar && !isNaN(numVal) && (
          <div className="flex-1 h-1.5 bg-primary-100 rounded-full overflow-hidden max-w-[80px]">
            <div
              className="h-full rounded-full bg-primary-400 transition-all"
              style={{ width: `${Math.min(numVal * 100, 100)}%` }}
            />
          </div>
        )}
      </div>
      <span className={`font-mono font-semibold shrink-0 ${highlight ? 'text-primary-900' : 'text-primary-800'}`}>
        {displayValue}
      </span>
    </div>
  );
}

export default function ObservabilityMetrics({ student, recommendations }) {
  const hasStudent = student && Object.keys(student).length > 0;
  const hasRec = recommendations && Object.keys(recommendations).length > 0;

  if (!hasStudent && !hasRec) {
    return <p className="text-xs text-primary-400 italic">No metrics yet.</p>;
  }

  return (
    <div className="space-y-3">
      {hasStudent && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-primary-400 mb-1.5">
            Student Metrics
          </div>
          <div className="space-y-1">
            <MetricRow label="streak_days" value={student.streak_days} bar />
            <MetricRow label="total_completed" value={student.total_completed} bar />
            <MetricRow label="total_skipped" value={student.total_skipped} bar />
            <MetricRow label="completion_rate_7d" value={student.completion_rate_7d} highlight bar />
            <MetricRow label="completion_rate_3d" value={student.completion_rate_3d} highlight bar />
            <MetricRow label="avg_difficulty_7d" value={student.avg_difficulty_7d} />
            <MetricRow label="consecutive_skips" value={student.consecutive_skips} />
            <MetricRow label="last_mood" value={student.last_mood || 'none'} />
          </div>
        </div>
      )}
      {hasRec && (
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-primary-400 mb-1.5">
            AI Recommendations
          </div>
          <div className="space-y-1">
            <MetricRow label="ai_tasks_suggested" value={recommendations.ai_tasks_suggested_total} bar />
            <MetricRow label="ai_tasks_accepted" value={recommendations.ai_tasks_accepted_total} bar />
            <MetricRow label="ai_tasks_rejected" value={recommendations.ai_tasks_rejected_total} bar />
            <MetricRow label="ai_tasks_pending" value={recommendations.ai_tasks_pending_total} bar />
            <MetricRow label="accept_rate" value={recommendations.accept_rate} highlight bar />
          </div>
        </div>
      )}
    </div>
  );
}
