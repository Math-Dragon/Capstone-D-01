import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAuditTrail, fetchStudentMetrics } from '../../../store/slices/observabilitySlice';
import PipelineTrace from './PipelineTrace';
import AuditTrail from './AuditTrail';
import ObservabilityMetrics from './ObservabilityMetrics';

export default function CoachObservability({ pipelineTrace, onRefresh }) {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const { auditLogs, actionCounts, studentMetrics, recommendationMetrics, loading, error, requestId } = useSelector(
    (s) => s.observability
  );

  useEffect(() => {
    if (open) {
      dispatch(fetchAuditTrail(50));
      dispatch(fetchStudentMetrics());
    }
  }, [open, dispatch]);

  useEffect(() => {
    if (onRefresh > 0) {
      dispatch(fetchAuditTrail(50));
      dispatch(fetchStudentMetrics());
    }
  }, [onRefresh, dispatch]);

  return (
    <div className="mt-4 border-t border-primary-100 pt-4">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 text-xs text-primary-400 hover:text-primary-700 transition-colors w-full"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-semibold uppercase tracking-wide">Observability</span>
        {loading && (
          <svg className="w-3 h-3 animate-spin text-primary-300" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {error && <span className="text-red-500 text-[10px] ml-auto">{error}</span>}
      </button>

      {open && (
        <div className="mt-3 animate-fade-in">
          {requestId && (
            <div className="text-[9px] font-mono text-primary-300 mb-2 text-right">
              trace: {requestId.slice(0, 8)}…
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <section className="card p-4">
              <h4 className="text-xs font-semibold text-primary-800 mb-1">Pipeline Trace</h4>
              <p className="text-[10px] text-primary-400 mb-3">LLM call attempts, retries, validation.</p>
              <PipelineTrace trace={pipelineTrace} />
            </section>

            <section className="card p-4">
              <h4 className="text-xs font-semibold text-primary-800 mb-1">Audit Trail</h4>
              <p className="text-[10px] text-primary-400 mb-3">Decision log from <code className="font-mono">audit_logs</code>.</p>
              <AuditTrail
                logs={auditLogs}
                actionCounts={actionCounts}
              />
            </section>

            <section className="card p-4">
              <h4 className="text-xs font-semibold text-primary-800 mb-1">Metrics</h4>
              <p className="text-[10px] text-primary-400 mb-3">Counters for cost + quality monitoring.</p>
              <ObservabilityMetrics
                student={studentMetrics}
                recommendations={recommendationMetrics}
              />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
