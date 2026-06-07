import { useEffect, useRef } from 'react';
import useFocusTrap from '../hooks/useFocusTrap';
import RationaleDisplay from './RationaleDisplay';

const DIFF_STYLES = {
  added: { bg: 'bg-green-50 border-green-200', prefix: '+', text: 'text-green-800' },
  modified: { bg: 'bg-amber-50 border-amber-200', prefix: '~', text: 'text-amber-800' },
  removed: { bg: 'bg-red-50 border-red-200', prefix: '-', text: 'text-red-800' },
};

export default function ProposalOverlay({ proposal, onAccept, onReject, accepting = false }) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, !!proposal);

  useEffect(() => {
    if (!proposal) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onReject();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onReject, proposal]);

  if (!proposal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onReject}>
      <div
        ref={containerRef}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-title"
      >
        <h3 id="proposal-title" className="text-lg font-bold text-primary-900 mb-2">
          Coach Menyesuaikan Rencana
        </h3>
        <p className="text-sm text-primary-500 mb-4">{proposal.summary}</p>

        {proposal.tasks?.length > 0 && (
          <div className="space-y-2 mb-4">
            {proposal.tasks.map((task, i) => {
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

        <div className="flex gap-3 justify-end">
          <button
            onClick={onReject}
            className="btn-secondary text-sm"
          >
            Tolak
          </button>
          <button
            onClick={onAccept}
            disabled={accepting}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary-900 text-white hover:bg-primary-800 transition-colors disabled:opacity-50"
          >
            {accepting ? 'Menyimpan...' : 'Setuju'}
          </button>
        </div>
      </div>
    </div>
  );
}
