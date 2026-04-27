import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useCoach } from '../features/coach/context/CoachContext';
import TaskActionModal from '../components/TaskActionModal';

const TASK_TYPE_COLORS = {
  acquire: '#818CF8',
  practice: '#F0A500',
  recall: '#EC4899',
  interleave: '#06B6D4',
  synthesize: '#A78BFA',
  review: '#34D399',
  assess: '#F87171',
  reflect: '#94A3B8',
};

const SLOT_LABELS = {
  morning: '☀️ Pagi',
  afternoon: '⛅ Siang',
  evening: '🌙 Malam',
};

const STATUS_MAP = {
  todo: { label: 'Belum', color: 'bg-primary-200' },
  in_progress: { label: 'Proses', color: 'bg-yellow-400' },
  done: { label: 'Selesai', color: 'bg-green-500' },
  completed: { label: 'Selesai', color: 'bg-green-500' },
  skipped: { label: 'Dilewati', color: 'bg-red-400' },
};

export default function GoalDetailPage() {
  const coachCtx = useCoach();
  const { id } = useParams();
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [modalTask, setModalTask] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [toast, setToast] = useState(null);

  const openModal = (task, mode) => {
    setModalTask(task);
    setModalMode(mode);
  };

  const closeModal = () => {
    setModalTask(null);
    setModalMode(null);
  };

  const handleModalConfirm = async ({ action, reason, difficulty, focus, notes }) => {
    if (!modalTask) return;
    setActionLoading(modalTask.id);
    try {
      let result;
      if (action === 'complete') {
        result = await coachCtx.dispatchTaskAction('COMPLETE_TASK', { taskId: modalTask.id });
        setGoal((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === modalTask.id ? { ...t, status: 'done' } : t
          ),
        }));
      } else if (action === 'skip') {
        result = await coachCtx.dispatchTaskAction('SKIP_TASK', { taskId: modalTask.id, reason: reason || 'unspecified' });
        setGoal((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === modalTask.id ? { ...t, status: 'skipped' } : t
          ),
        }));
      } else if (action === 'feedback') {
        result = await coachCtx.dispatchTaskAction('SUBMIT_FEEDBACK', { taskId: modalTask.id, difficulty, focus, notes });
      }
      if (result?.data?.message) {
        setToast({ message: result.data.message });
        setTimeout(() => setToast(null), 6000);
      }
    } catch (err) {
      console.error(`Failed to ${action} task:`, err);
    } finally {
      setActionLoading(null);
      closeModal();
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get(`/goals/${id}`);
        setGoal(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="animate-spin h-8 w-8 text-primary-400" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div>
        <Link to="/goals" className="text-sm text-primary-400 hover:text-primary-600 mb-4 inline-block">
          ← Kembali ke Target
        </Link>
        <div className="card p-8 text-center">
          <p className="text-red-500 mb-4">{error || 'Target tidak ditemukan'}</p>
          <Link to="/goals" className="btn-secondary">Kembali</Link>
        </div>
      </div>
    );
  }

  const tasks = goal.tasks || [];
  const completedCount = tasks.filter((t) => t.status === 'done' || t.status === 'completed').length;
  const totalMin = tasks.reduce((s, t) => s + (t.duration_estimate || 0), 0);
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const tasksByDate = {};
  tasks.forEach((t) => {
    const d = t.planned_date ? t.planned_date.slice(0, 10) : 'unassigned';
    if (!tasksByDate[d]) tasksByDate[d] = [];
    tasksByDate[d].push(t);
  });

  return (
    <div>
      <Link to="/goals" className="text-sm text-primary-400 hover:text-primary-600 mb-4 inline-block">
        ← Kembali ke Target
      </Link>

      {/* Goal Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-primary-900">{goal.title}</h2>
            {goal.description && (
              <p className="text-primary-500 mt-2">{goal.description}</p>
            )}
          </div>
          <span className={`text-xs font-semibold uppercase px-3 py-1 rounded-full ${
            goal.status === 'active'
              ? 'bg-green-100 text-green-700'
              : goal.status === 'completed'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-primary-50 text-primary-400'
          }`}>
            {goal.status === 'active' ? 'Aktif' : goal.status}
          </span>
        </div>
        {goal.deadline && (
          <p className="text-sm text-primary-400">
            📅 Deadline: {new Date(goal.deadline).toLocaleDateString('id-ID', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        )}
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-primary-900">{progressPct}%</div>
          <div className="text-xs text-primary-400 mt-1">Progres</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-primary-900">{completedCount}/{tasks.length}</div>
          <div className="text-xs text-primary-400 mt-1">Tugas</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-primary-900">{totalMin}m</div>
          <div className="text-xs text-primary-400 mt-1">Total Waktu</div>
        </div>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="text-lg font-semibold text-primary-900 mb-2">Belum ada tugas</h3>
          <p className="text-primary-400 mb-4">
            Gunakan Coach untuk mendapatkan rekomendasi rencana belajar.
          </p>
          <Link to="/coach" className="btn-primary">Tanya Coach</Link>
        </div>
      ) : (
        Object.entries(tasksByDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, dateTasks]) => (
            <div key={date} className="mb-6">
              <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wide mb-3">
                {date === 'unassigned'
                  ? 'Belum dijadwalkan'
                  : new Date(date + 'T00:00:00').toLocaleDateString('id-ID', {
                      weekday: 'long', day: 'numeric', month: 'long'
                    })
                }
              </h3>
              <div className="space-y-2">
                {dateTasks.map((task) => {
                  const status = STATUS_MAP[task.status] || STATUS_MAP.todo;
                  const color = TASK_TYPE_COLORS[task.task_type] || '#94A3B8';
                  const isDone = task.status === 'done' || task.status === 'completed';
                  return (
                    <div
                      key={task.id}
                      className="card p-4 border-l-4"
                      style={{ borderLeftColor: color }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status.color}`} />
                            <span className="text-xs text-primary-400">
                              {task.planned_slot ? SLOT_LABELS[task.planned_slot] || task.planned_slot : ''}
                            </span>
                            <span className="text-xs text-primary-300">·</span>
                            <span className="text-xs font-medium text-primary-900">{task.duration_estimate}m</span>
                          </div>
                          <h4 className={`text-sm font-medium ${isDone ? 'line-through text-primary-400' : 'text-primary-900'}`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-primary-400 mt-1 line-clamp-2">{task.description}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {task.task_type && (
                            <span
                              className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded flex-shrink-0"
                              style={{ backgroundColor: color + '22', color }}
                            >
                              {task.task_type}
                            </span>
                          )}
                          {!isDone && task.status !== 'skipped' && (
                            <div className="flex gap-1 mt-1">
                              <button
                                onClick={() => openModal(task, 'complete')}
                                disabled={actionLoading === task.id}
                                className="text-[10px] px-2 py-1 rounded bg-green-500/20 text-green-700 hover:bg-green-500/30 transition-colors disabled:opacity-50 font-medium"
                              >
                                ✓ Selesai
                              </button>
                              <button
                                onClick={() => openModal(task, 'skip')}
                                disabled={actionLoading === task.id}
                                className="text-[10px] px-2 py-1 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors disabled:opacity-50 font-medium"
                              >
                                ⏭ Lewati
                              </button>
                              <button
                                onClick={() => openModal(task, 'feedback')}
                                className="text-[10px] px-2 py-1 rounded bg-blue-500/20 text-blue-600 hover:bg-blue-500/30 transition-colors font-medium"
                              >
                                💬 Feedback
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
      )}

      <TaskActionModal
        task={modalTask}
        mode={modalMode}
        onConfirm={handleModalConfirm}
        onCancel={closeModal}
      />

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-fade-in">
          <div className="bg-primary-900 text-white rounded-2xl shadow-xl px-4 py-3 flex items-start gap-3">
            <span className="text-lg flex-shrink-0">🤖</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed">{toast.message}</p>
              <Link to="/coach" className="text-xs text-primary-300 hover:text-white underline mt-1 inline-block">
                Lihat di Chat →
              </Link>
            </div>
            <button onClick={() => setToast(null)} className="text-primary-400 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>
      )}
    </div>
  );
}
