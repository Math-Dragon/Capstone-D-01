const STATUS_STYLES = {
  success: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700', label: 'OK', dot: 'bg-green-500' },
  validation_failed: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'VALIDATION', dot: 'bg-amber-500' },
  transient_error: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700', label: 'ERROR', dot: 'bg-red-500' },
};

export default function PipelineTrace({ trace }) {
  if (!trace || !trace.attempts || trace.attempts.length === 0) {
    return <p className="text-xs text-primary-400 italic">No pipeline data yet.</p>;
  }

  const successCount = trace.attempts.filter(a => a.status === 'success').length;
  const failCount = trace.attempts.filter(a => a.status !== 'success').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] px-3 py-2 bg-primary-50 rounded-lg">
        <span className="text-primary-500 font-medium">
          {trace.attempts.length} attempt{trace.attempts.length > 1 ? 's' : ''}
          {successCount > 0 && <span className="text-green-600 ml-1">· {successCount} ok</span>}
          {failCount > 0 && <span className="text-red-500 ml-1">· {failCount} fail</span>}
        </span>
        <span className="font-mono font-semibold text-primary-800">
          {trace.duration_ms != null
            ? (trace.duration_ms < 1000 ? `${trace.duration_ms}ms` : `${(trace.duration_ms / 1000).toFixed(1)}s`)
            : '—'}
        </span>
      </div>

      {trace.attempts.map((a, i) => {
        const style = STATUS_STYLES[a.status] || STATUS_STYLES.transient_error;
        return (
          <div key={i} className={`border-l-4 ${style.border} ${style.bg} rounded-r-lg p-2.5`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shrink-0`} />
                <span className="text-[10px] font-semibold text-primary-600 shrink-0">#{a.attempt || i + 1}</span>
                {a.source && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-white/60 rounded font-mono text-primary-500 truncate max-w-[100px]">
                    {a.source}
                  </span>
                )}
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${style.bg} ${style.text} shrink-0`}>
                  {style.label}
                </span>
              </div>
              {a.duration_ms != null && (
                <span className="text-[10px] font-mono text-primary-400 shrink-0 ml-2">{a.duration_ms}ms</span>
              )}
            </div>
            {a.usage && (
              <div className="flex gap-3 mt-1 text-[9px] font-mono text-primary-400">
                {a.usage.prompt_tokens != null && <span className="flex items-center gap-0.5"><span className="text-blue-400">P</span>{a.usage.prompt_tokens}</span>}
                {a.usage.completion_tokens != null && <span className="flex items-center gap-0.5"><span className="text-purple-400">C</span>{a.usage.completion_tokens}</span>}
                {a.usage.total_tokens != null && <span className="font-semibold text-primary-500 flex items-center gap-0.5"><span>∑</span>{a.usage.total_tokens}</span>}
              </div>
            )}
            {a.raw_output_preview && (
              <p className="text-[10px] font-mono text-primary-500 truncate mt-1">{a.raw_output_preview}</p>
            )}
            {a.error && (
              <details className="mt-1.5">
                <summary className="text-[10px] cursor-pointer text-red-600 font-medium">Error detail</summary>
                <pre className="mt-1 text-[9px] bg-white p-2 rounded border overflow-auto max-h-32 font-mono whitespace-pre-wrap">
                  {typeof a.error === 'string' ? a.error : JSON.stringify(a.error, null, 2)}
                </pre>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}
