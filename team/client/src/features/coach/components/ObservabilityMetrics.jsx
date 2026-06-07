function MetricRow({ label, value, highlight }) {
  const displayValue = typeof value === 'number'
    ? (value < 1 && value > 0 ? (value * 100).toFixed(0) + '%' : String(value))
    : (value ?? 'n/a');

  return (
    <div className={`flex justify-between items-center text-[10px] p-2 rounded ${highlight ? 'bg-primary-100/60' : 'bg-primary-50'}`}>
      <code className="text-primary-500">{label}</code>
      <span className="font-mono font-semibold text-primary-800">{displayValue}</span>
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
            <MetricRow label="streak_days" value={student.streak_days} />
            <MetricRow label="total_completed" value={student.total_completed} />
            <MetricRow label="total_skipped" value={student.total_skipped} />
            <MetricRow label="completion_rate_7d" value={student.completion_rate_7d} highlight />
            <MetricRow label="completion_rate_3d" value={student.completion_rate_3d} highlight />
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
            <MetricRow label="ai_tasks_suggested" value={recommendations.ai_tasks_suggested_total} />
            <MetricRow label="ai_tasks_accepted" value={recommendations.ai_tasks_accepted_total} />
            <MetricRow label="ai_tasks_rejected" value={recommendations.ai_tasks_rejected_total} />
            <MetricRow label="ai_tasks_pending" value={recommendations.ai_tasks_pending_total} />
            <MetricRow label="accept_rate" value={recommendations.accept_rate} highlight />
          </div>
        </div>
      )}
    </div>
  );
}
