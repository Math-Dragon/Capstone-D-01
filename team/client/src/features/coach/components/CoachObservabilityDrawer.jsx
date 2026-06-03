import { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchAuditTrail, fetchStudentMetrics } from '../../../store/slices/observabilitySlice';
import useFocusTrap from '../../../hooks/useFocusTrap';
import PipelineTrace from './PipelineTrace';
import AuditTrail from './AuditTrail';
import ObservabilityMetrics from './ObservabilityMetrics';

const ACTION_LABELS = {
  COACH_TASK_ACCEPTED: 'Diterima',
  COACH_TASK_REJECTED: 'Ditolak',
  COACH_TASK_COMPLETED: 'Selesai',
  COACH_TASK_SKIPPED: 'Dilewati',
  COACH_LLM_CALL: 'Panggilan LLM',
  COACH_LLM_ERROR: 'Error LLM',
  COACH_CHAT_MESSAGE: 'Chat',
  COACH_FEEDBACK_SUBMITTED: 'Umpan Balik',
  COACH_PLAN_GENERATED: 'Rencana',
};

function KpiCard({ label, value, trend }) {
  return (
    <div className="bg-white rounded-xl border border-primary-100 p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-primary-900 tabular-nums">{value}</p>
      {trend !== undefined && (
        <span className={`text-[10px] font-medium ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-primary-400'}`}>
          {trend > 0 ? '\u2191' : trend < 0 ? '\u2193' : '\u2192'} {Math.abs(trend)}%
        </span>
      )}
    </div>
  );
}

function AccordionSection({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useRef(`accordion-${Math.random().toString(36).slice(2, 8)}`);
  const contentId = `${id.current}-content`;
  return (
    <div className="border border-primary-100 rounded-xl overflow-hidden">
      <button
        id={id.current}
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        aria-controls={contentId}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((p) => !p);
          }
        }}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-primary-700 bg-primary-50/50 hover:bg-primary-50 transition-colors"
      >
        {title}
        <svg
          className={`w-3.5 h-3.5 transition-transform text-primary-400 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div id={contentId} role="region" aria-labelledby={id.current} className="px-4 py-3">
          {children}
        </div>
      )}
    </div>
  );
}

export default function CoachObservabilityDrawer({ open, onClose, pipelineTrace, onRefresh }) {
  const dispatch = useDispatch();
  const panelRef = useRef(null);
  const closeCallback = useCallback(() => onClose(), [onClose]);
  useFocusTrap(panelRef, open);
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

  const barData = actionCounts
    ? Object.entries(actionCounts)
        .filter(([key]) => ACTION_LABELS[key])
        .map(([key, count]) => ({ name: ACTION_LABELS[key], count }))
        .sort((a, b) => b.count - a.count)
    : [];

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Panel observabilitas coach"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          onClose();
        }
      }}
      className={`h-full bg-white border-r border-primary-100 overflow-hidden transition-all duration-300 ease-in-out ${
        open ? 'w-80 shadow-[2px_0_8px_-3px_rgba(0,0,0,0.06)]' : 'w-0'
      }`}
    >
      <div className="w-80 h-full flex flex-col">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-primary-100">
            <div>
              <h3 className="text-sm font-bold text-primary-900">Observabilitas</h3>
              {loading && (
                <span className="text-[10px] text-primary-400">Memuat...</span>
              )}
              {requestId && !loading && (
                <span className="text-[9px] font-mono text-primary-300">trace: {requestId.slice(0, 8)}…</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
              aria-label="Tutup panel observabilitas"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {error && (
              <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Accept Rate" value={`${acceptRate}%`} trend={acceptRate > 50 ? 1 : acceptRate > 0 ? -1 : 0} />
              <KpiCard label="Tugas Disarankan" value={suggested} />
              <KpiCard label="Ditolak" value={rejected} />
              <KpiCard label="Tertunda" value={pending} />
            </div>

            {barData.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-primary-700 mb-3">Distribusi Aksi</h4>
                <div className="bg-white rounded-xl border border-primary-100 p-3">
                  <ResponsiveContainer width="100%" height={barData.length * 32 + 20}>
                    <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        formatter={(val) => [val, 'Jumlah']}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-primary-700">Detail</h4>
              <AccordionSection title="Jejak Pipeline">
                <PipelineTrace trace={pipelineTrace} />
              </AccordionSection>
              <AccordionSection title="Log Audit">
                <AuditTrail logs={auditLogs} actionCounts={actionCounts} />
              </AccordionSection>
              <AccordionSection title="Metrik Lengkap">
                <ObservabilityMetrics student={studentMetrics} recommendations={recommendationMetrics} />
              </AccordionSection>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
