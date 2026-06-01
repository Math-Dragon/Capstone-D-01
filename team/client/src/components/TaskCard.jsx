import { useState, memo } from 'react';
import { TASK_TYPE_PALETTE, SLOT_LABELS } from '../utils/constants';
import RationaleDisplay from './RationaleDisplay';

const PRIORITY_DOT = { high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-gray-300' };

const TaskCard = memo(function TaskCard({
  task,
  onComplete,
  onModify,
  onSkip,
  onClickTitle,
  showRationale = true,
  compact = false,
  index = 0,
  loading = false,
}) {
  const [rationaleOpen, setRationaleOpen] = useState(false);

  const palette = TASK_TYPE_PALETTE[task.task_type] || { icon: '📝', color: '#94A3B8' };
  const isDone = task.status === 'done' || task.status === 'completed';
  const isSkipped = task.status === 'skipped';
  const isInactive = isDone || isSkipped;

  const stateClasses = isDone
    ? 'opacity-55 border-l-4 border-l-green-500'
    : isSkipped
    ? 'opacity-45 border-l-4 border-l-red-400'
    : 'border-l-4';

  return (
    <div
      className={`card p-4 ${stateClasses} animate-fadeIn hover:-translate-y-px transition-all duration-200`}
      style={{
        borderLeftColor: isDone ? undefined : isSkipped ? undefined : palette.color,
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full"
            style={{ backgroundColor: palette.color + '22', color: palette.color }}
          >
            {palette.icon} {task.task_type || 'task'}
          </span>
          {task.priority && (
            <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority] || 'bg-gray-300'}`} title={task.priority} />
          )}
        </div>
        {task.duration_estimate && (
          <span className="text-xs font-medium text-primary-400">{task.duration_estimate}m</span>
        )}
      </div>

      {/* Title */}
      <h3>
        <button
          type="button"
          className={`block w-full text-left font-medium text-sm hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded ${isDone ? 'line-through text-primary-400' : 'text-primary-900'}`}
          onClick={() => onClickTitle?.(task)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onClickTitle?.(task);
            }
          }}
          aria-label={`Buka detail task ${task.title}`}
        >
          {task.title}
        </button>
      </h3>

      {/* Description */}
      {!compact && task.description && (
        <p className="text-xs text-primary-400 mt-1 line-clamp-2">{task.description}</p>
      )}

      {/* Metadata row */}
      {!compact && (
        <div className="flex items-center gap-3 mt-2 text-xs text-primary-400">
          {task.planned_slot && <span>{SLOT_LABELS[task.planned_slot] || task.planned_slot}</span>}
          {task.completion_criteria && (
            <span className="truncate max-w-[40ch]" title={task.completion_criteria}>
              {task.completion_criteria}
            </span>
          )}
        </div>
      )}

      {/* Rationale */}
      {showRationale && task.rationale && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setRationaleOpen(!rationaleOpen)}
            className="text-[11px] font-medium text-primary-500 hover:text-primary-700 transition-colors flex items-center gap-1"
            aria-expanded={rationaleOpen}
            aria-controls={`rationale-${task.id}`}
          >
            <svg className={`w-3 h-3 transition-transform ${rationaleOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Why this task?
          </button>
          {rationaleOpen && (
            <RationaleDisplay id={`rationale-${task.id}`} rationale={task.rationale} compact className="mt-1 ml-1" />
          )}
        </div>
      )}

      {/* Divider + Actions */}
      {!isInactive && (
        <>
          <hr className="my-3 border-primary-100" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => onComplete?.(task)}
              disabled={loading}
              className="flex-1 text-xs font-semibold py-2 rounded-lg bg-green-500/15 text-green-700 hover:bg-green-500/25 transition-colors disabled:opacity-50"
              aria-label={`Selesaikan tugas: ${task.title}`}
            >
              ✓ Done
            </button>
            <button
              onClick={() => onModify?.(task)}
              disabled={loading}
              className="text-xs px-3 py-2 rounded-lg bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 transition-colors disabled:opacity-50"
              aria-label={`Modify task: ${task.title}`}
              title="Modify"
            >
              ✏️
            </button>
            <button
              onClick={() => onSkip?.(task)}
              disabled={loading}
              className="text-xs px-3 py-2 rounded-lg bg-red-500/15 text-red-600 hover:bg-red-500/25 transition-colors disabled:opacity-50"
              aria-label={`Skip task: ${task.title}`}
              title="Skip"
            >
              ⏭
            </button>
          </div>
        </>
      )}
    </div>
  );
});

export default TaskCard;
