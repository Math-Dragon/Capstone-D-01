import { NavLink } from 'react-router-dom';

export default function GoalCard({ goal, onDelete, onEdit }) {
  return (
    <div className="goal-card card">
      <div className="flex justify-between items-start">
        <NavLink to={`/goals/${goal.id}`} className="flex-1">
          <h3 className="text-lg font-semibold mb-2 hover:text-primary transition-colors">
            {goal.title}
          </h3>
        </NavLink>
        <div className="flex gap-2">
          {onEdit && (
            <button onClick={() => onEdit(goal)} className="btn-icon" title="Edit">
              ✏️
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(goal.id)} className="btn-icon text-red-500" title="Hapus">
              🗑️
            </button>
          )}
        </div>
      </div>
      {goal.description && (
        <p className="text-muted text-sm mb-4 line-clamp-2">{goal.description}</p>
      )}
      <div className="flex items-center gap-4 text-sm text-muted">
        {goal.deadline && (
          <span className="flex items-center gap-1">
            📅 {new Date(goal.deadline).toLocaleDateString('id-ID')}
          </span>
        )}
        {goal.task_count !== undefined && (
          <span className="flex items-center gap-1">
            📝 {goal.task_count} tugas
          </span>
        )}
      </div>
    </div>
  );
}