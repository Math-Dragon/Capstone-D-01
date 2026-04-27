import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoals } from '../context/GoalsContext';

export default function GoalCard({ goal }) {
  const navigate = useNavigate();
  const { remove } = useGoals();
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await remove(goal.id);
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="card p-5 hover:-translate-y-1 transition-all duration-300">
      <Link to={`/goals/${goal.id}`}>
        <h3 className="font-semibold text-primary-900 mb-2 hover:text-primary-600 transition-colors">
          {goal.title}
        </h3>
      </Link>
      {goal.description && (
        <p className="text-sm text-primary-500 mb-3 line-clamp-2">{goal.description}</p>
      )}
      <div className="flex items-center justify-between gap-4 text-sm text-primary-400">
        <div className="flex items-center gap-4">
          {goal.deadline && (
            <span>📅 {new Date(goal.deadline).toLocaleDateString('id-ID')}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/goals/${goal.id}`); }}
            className="text-xs px-2 py-1 rounded bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors"
          >
            ✏️ Edit
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={deleting}
                className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? '...' : 'Hapus'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              🗑️ Hapus
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
