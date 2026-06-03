import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAuditTrail, fetchStudentMetrics } from '../../../store/slices/observabilitySlice';
import PipelineTrace from './PipelineTrace';
import AuditTrail from './AuditTrail';
import ObservabilityMetrics from './ObservabilityMetrics';

const TABS = [
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'audit', label: 'Audit Log' },
  { key: 'metrics', label: 'Raw Metrics' },
];

function KpiCard({ label, value, sub, trend }) {
  return (
    <div className="bg-white rounded-xl border border-primary-100 p-4 shadow-sm min-w-[140px] flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-primary-900 tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-primary-400 mt-0.5">{sub}</p>}
      {trend && (
        <span className={`text-[10px] font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-primary-400'}`}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
        </span>
      )}
    </div>
  );
}

export default function CoachObservability({ pipelineTrace, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pipeline');
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

  const suggested = recommendationMetrics?.ai_tasks_suggested_total || 0;
  const accepted = recommendationMetrics?.ai_tasks_accepted_total || 0;
  const rejected = recommendationMetrics?.ai_tasks_rejected_total || 0;
  const pending = recommendationMetrics?.ai_tasks_pending_total || 0;
  const totalDecided = accepted + rejected;
  const acceptRate = totalDecided > 0 ? Math.round((accepted / totalDecided) * 100) : 0;

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
            <div className="text-[9px] font-mono text-primary-300 mb-3 text-right">
              trace: {requestId.slice(0, 8)}…
            </div>
          )}

          <div className="flex gap-3 mb-4 overflow-x-auto pb-1">
            <KpiCard label="Accept Rate" value={`${acceptRate}%`} trend={acceptRate > 50 ? 1 : acceptRate > 0 ? -1 : 0} />
            <KpiCard label="Tasks Suggested" value={suggested} sub={`${accepted} accepted`} />
            <KpiCard label="Rejected" value={rejected} />
            <KpiCard label="Pending" value={pending} />
          </div>

          <div className="flex gap-1 mb-4 border-b border-primary-100">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 text-[11px] font-semibold transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? 'border-primary-900 text-primary-900'
                    : 'border-transparent text-primary-400 hover:text-primary-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="min-h-[120px]">
            {activeTab === 'pipeline' && (
              <section className="card p-4">
                <h4 className="text-xs font-semibold text-primary-800 mb-1">Pipeline Trace</h4>
                <p className="text-[10px] text-primary-400 mb-3">LLM call attempts, retries, validation.</p>
                <PipelineTrace trace={pipelineTrace} />
              </section>
            )}
            {activeTab === 'audit' && (
              <section className="card p-4">
                <h4 className="text-xs font-semibold text-primary-800 mb-1">Audit Trail</h4>
                <p className="text-[10px] text-primary-400 mb-3">Decision log from <code className="font-mono">audit_logs</code>.</p>
                <AuditTrail logs={auditLogs} actionCounts={actionCounts} />
              </section>
            )}
            {activeTab === 'metrics' && (
              <section className="card p-4">
                <h4 className="text-xs font-semibold text-primary-800 mb-1">Metrics</h4>
                <p className="text-[10px] text-primary-400 mb-3">Counters for cost + quality monitoring.</p>
                <ObservabilityMetrics student={studentMetrics} recommendations={recommendationMetrics} />
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
