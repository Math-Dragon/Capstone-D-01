import { useEffect, useRef } from 'react';
import useFocusTrap from '../../../hooks/useFocusTrap';
import RationaleDisplay from '../../tasks/components/RationaleDisplay';

const DIFF_STYLES = {
  added: { bg: 'bg-green-50 border-green-200', prefix: '+', text: 'text-green-800' },
  modified: { bg: 'bg-amber-50 border-amber-200', prefix: '~', text: 'text-amber-800' },
  removed: { bg: 'bg-red-50 border-red-200', prefix: '-', text: 'text-red-800' },
  rescheduled: { bg: 'bg-sky-50 border-sky-200', prefix: '↻', text: 'text-sky-800' },
};

const CHANGE_GROUPS = [
  { key: 'added', label: 'Ditambahkan', prefix: '+' },
  { key: 'modified', label: 'Diubah', prefix: '~' },
  { key: 'removed', label: 'Dihapus', prefix: '−' },
  { key: 'rescheduled', label: 'Dijadwalkan ulang', prefix: '↻' },
];

const MAX_EVIDENCE = 3;

function noop() {}

function ChangeItem({ item, style, prefix }) {
  return (
    <div className={`p-3 rounded-xl border ${style.bg}`}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-primary-400">{prefix}</span>
        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-primary-100 text-primary-600">
          {item.task_type || 'task'}
        </span>
        {item.duration_estimate != null && (
          <span className="text-xs text-primary-400">{item.duration_estimate}m</span>
        )}
        {item.planned_date && <span className="text-xs text-primary-400">{item.planned_date}</span>}
        {item.planned_slot && <span className="text-xs text-primary-400">{item.planned_slot}</span>}
      </div>
      <p className={`text-sm font-medium mt-1 ${style.text}`}>{item.title}</p>
    </div>
  );
}

export default function ProposalOverlay({
  proposal,
  onAccept,
  onReject,
  onDismiss,
  accepting = false,
  rejecting = false,
  error,
}) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, !!proposal);

  const dismiss = onDismiss || noop;

  useEffect(() => {
    if (!proposal) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [dismiss, proposal]);

  if (!proposal) return null;

  const evidence = (Array.isArray(proposal.evidence) ? proposal.evidence : [])
    .slice(0, MAX_EVIDENCE)
    .map((item) => ({
      code: item?.code,
      summary: item?.summary,
      window: item?.window,
      count: item?.count,
    }));
  const changes = proposal.changes || null;
  const legacyTasks = proposal.tasks || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={dismiss}>
      <div
        ref={containerRef}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-title"
      >
        <h3 id="proposal-title" className="text-lg font-bold text-primary-900 mb-2">
          Saran penyesuaian rencana
        </h3>
        <p className="text-sm text-primary-500 mb-4">{proposal.summary}</p>

        {error && (
          <div role="alert" className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
            {error}
          </div>
        )}

        {evidence.length > 0 && (
          <div className="mb-4">
            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-primary-400 mb-2">Yang perlu kamu tahu</h4>
            <ul className="space-y-2">
              {evidence.map((item, i) => (
                <li key={item.code || i} className="p-3 rounded-xl border border-primary-100 bg-primary-50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-primary-100 text-primary-600">
                      {item.code}
                    </span>
                    {item.window && <span className="text-xs text-primary-400">{item.window}</span>}
                    {item.count != null && <span className="text-xs text-primary-400">{item.count}×</span>}
                  </div>
                  <p className="text-sm text-primary-500 mt-1">{item.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {legacyTasks.length > 0 && (
          <div className="space-y-2 mb-4">
            {legacyTasks.map((task, i) => {
              const diffType = task.diffType || 'added';
              const style = DIFF_STYLES[diffType] || DIFF_STYLES.added;
              return (
                <div key={task.id || i} className={`p-3 rounded-xl border ${style.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-primary-400">{style.prefix}</span>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-primary-100 text-primary-600">
                      {task.task_type || 'task'}
                    </span>
                    <span className="text-xs text-primary-400">{task.duration_estimate}m</span>
                  </div>
                  <p className={`text-sm font-medium mt-1 ${style.text}`}>{task.title}</p>
                  <RationaleDisplay rationale={task.rationale} confidence={task.confidence} compact className="mt-2" />
                </div>
              );
            })}
          </div>
        )}

        {changes && (
          <div className="space-y-4 mb-4">
            {CHANGE_GROUPS.map((group) => {
              const items = Array.isArray(changes[group.key]) ? changes[group.key] : [];
              if (items.length === 0) return null;
              const style = DIFF_STYLES[group.key];
              return (
                <div key={group.key}>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wide text-primary-400 mb-2">
                    {group.prefix} {group.label}
                  </h4>
                  <div className="space-y-2">
                    {items.map((item, i) => (
                      <ChangeItem key={`${group.key}-${item.title || i}`} item={item} style={style} prefix={group.prefix} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onReject}
            disabled={rejecting}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            Tolak
          </button>
          <button
            onClick={onAccept}
            disabled={accepting}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary-900 text-white hover:bg-primary-800 transition-colors disabled:opacity-50"
          >
            {accepting ? 'Menyimpan...' : 'Terapkan'}
          </button>
        </div>
      </div>
    </div>
  );
}
