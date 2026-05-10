import { useState, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoals } from '../context/GoalsContext';
import { Modal } from '../../../components/ui/Modal';

const GoalCard = memo(function GoalCard({ goal }) {
  const navigate = useNavigate();
  const { remove } = useGoals();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const total = goal.task_total ?? 0;
  const completed = goal.task_completed ?? 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await remove(goal.id);
    } catch {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="card p-5 hover:-translate-y-1 transition-all duration-300">
        <Link to={`/goals/${goal.id}`}>
          <h3 className="font-semibold text-primary-900 mb-2 hover:text-primary-600 transition-colors">
            {goal.title}
          </h3>
        </Link>
        {goal.description && (
          <p className="text-sm text-primary-500 mb-3 line-clamp-2">{goal.description}</p>
        )}

        {total > 0 && (
          <div className="mb-3">
            <div className="w-full bg-primary-100 rounded-full h-1.5">
              <div
                className="bg-primary-900 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-primary-400 mt-1 block">{progress}%</span>
          </div>
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
            <button
              onClick={(e) => { e.stopPropagation(); setShowDeleteModal(true); }}
              className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              🗑️ Hapus
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Hapus Target"
        description={`Konfirmasi hapus goal ${goal.title}`}
        size="sm"
      >
        <p className="text-sm text-primary-600 mb-4">
          Apakah kamu yakin ingin menghapus <strong>{goal.title}</strong>? Tindakan ini tidak bisa dibatalkan.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setShowDeleteModal(false)} className="btn-secondary text-sm">
            Batal
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </Modal>
    </>
  );
});

export default GoalCard;
