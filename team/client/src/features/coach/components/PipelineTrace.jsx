const STATUS_STYLES = {
  success: { border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700', label: 'OK' },
  validation_failed: { border: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', label: 'VALIDATION' },
  transient_error: { border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700', label: 'ERROR' },
};

export default function PipelineTrace({ trace }) {
  if (!trace || !trace.attempts || trace.attempts.length === 0) {
    return <p className="text-xs text-primary-400 italic">No pipeline data yet.</p>;
  }

  return (
    <div className="space-y-2">
      {trace.duration_ms != null && (
        <div className="flex items-center justify-between text-[10px] px-2 py-1.5 bg-primary-50 rounded-lg">
          <span className="text-primary-500">Total duration</span>
          <span className="font-mono font-semibold text-primary-800">
            {trace.duration_ms < 1000 ? `${trace.duration_ms}ms` : `${(trace.duration_ms / 1000).toFixed(1)}s`}
          </span>
        </div>
      )}
      {trace.attempts.map((a, i) => {
        const style = STATUS_STYLES[a.status] || STATUS_STYLES.transient_error;
        return (
          <div key={i} className={`border-l-4 ${style.border} ${style.bg} rounded-r-lg p-2.5`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-primary-600">#{a.attempt || i + 1}</span>
                {a.source && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-white/60 rounded font-mono text-primary-500">
                    {a.source}
                  </span>
                )}
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
              {a.duration_ms != null && (
                <span className="text-[10px] font-mono text-primary-400">{a.duration_ms}ms</span>
              )}
            </div>
            {a.raw_output_preview && (
              <p className="text-[10px] font-mono text-primary-500 truncate">{a.raw_output_preview}</p>
            )}
            {a.usage && (
              <div className="flex gap-2 mt-1 text-[9px] font-mono text-primary-400">
                {a.usage.prompt_tokens != null && <span>↑{a.usage.prompt_tokens}</span>}
                {a.usage.completion_tokens != null && <span>↓{a.usage.completion_tokens}</span>}
                {a.usage.total_tokens != null && <span className="font-semibold text-primary-500">∑{a.usage.total_tokens}</span>}
              </div>
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
