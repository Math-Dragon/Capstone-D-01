import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useGoals } from '../features/goals/hooks/useGoals';
import useTaskActions from '../hooks/useTaskActions';
import TaskDetailModal from '../components/TaskDetailModal';
import TaskCard from '../components/TaskCard';
import SlotDivider from '../components/SlotDivider';
import AdjustmentPanel from '../components/AdjustmentPanel';
import ProposalOverlay from '../components/ProposalOverlay';
import ModifyTaskModal from '../components/ModifyTaskModal';
import SkipTaskModal from '../components/SkipTaskModal';
import FeedbackModal from '../components/FeedbackModal';
import { onDataChanged } from '../utils/invalidation';
import { SLOT_ORDER } from '../utils/constants';

export default function GoalDetailPage() {
  const navigate = useNavigate();
  const { update, remove } = useGoals();
  const { id } = useParams();
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailTask, setDetailTask] = useState(null);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const openTaskDetail = (task) => setDetailTask(task);
  const closeDetail = () => setDetailTask(null);
  const saveNotes = async (taskId, notes) => {
    try {
      await api.patch(`/tasks/${taskId}`, { personal_notes: notes });
      setGoal(prev => ({
        ...prev,
        tasks: (prev.tasks || []).map(t => t.id === taskId ? { ...t, personal_notes: notes } : t),
      }));
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  const {
    proposal, activeModal, activeTask, actionLoading, proposalAccepting,
    handleComplete, handleSkip, handleModify, handleFeedback,
    confirmSkip, confirmModify, submitFeedback,
    acceptProposal, rejectProposal, closeModal,
  } = useTaskActions({
    onUpdateTasks: (updater) => setGoal(prev => ({
      ...prev,
      tasks: updater(prev.tasks || []),
    })),
    refreshData: async () => {
      const data = await api.get(`/goals/${id}`);
      setGoal(data);
    },
  });

  const startEditing = () => {
    setEditTitle(goal.title);
    setEditDescription(goal.description || '');
    setEditDeadline(goal.deadline ? goal.deadline.slice(0, 10) : '');
    setEditing(true);
  };

  const cancelEditing = () => setEditing(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await update(id, {
        title: editTitle,
        description: editDescription || null,
        deadline: editDeadline || null,
      });
      setGoal((prev) => ({ ...prev, ...updated }));
      setEditing(false);
    } catch (err) {
      console.error('Failed to update goal:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await remove(id);
      navigate('/goals');
    } catch (err) {
      console.error('Failed to delete goal:', err);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    async function load() {
      try {
        const data = await api.get(`/goals/${id}`, { signal });
        setGoal(data);
        setLoading(false);
      } catch (err) {
        if (err.name === 'CanceledError' || err.message === 'canceled') return;
        setError(err.message);
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    return onDataChanged(async () => {
      try {
        const data = await api.get(`/goals/${id}`);
        setGoal(data);
      } catch (error) {
        void error;
      }
    });
  }, [id]);

  const tasks = goal?.tasks || [];
  const completedCount = tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
  const totalMin = tasks.reduce((s, t) => s + (t.duration_estimate || 0), 0);
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const groupedTasks = useMemo(() => {
    const byDate = {};
    const unassigned = [];
    tasks.forEach(t => {
      if (!t.planned_date) {
        unassigned.push(t);
        return;
      }
      const d = t.planned_date.slice(0, 10);
      if (!byDate[d]) byDate[d] = {};
      const slot = t.planned_slot || 'unscheduled';
      if (!byDate[d][slot]) byDate[d][slot] = [];
      byDate[d][slot].push(t);
    });
    Object.values(byDate).forEach(dateGroup => {
      Object.values(dateGroup).forEach(slotArr =>
        slotArr.sort((a, b) => (SLOT_ORDER[a.planned_slot] ?? 9) - (SLOT_ORDER[b.planned_slot] ?? 9))
      );
    });
    return { byDate, unassigned };
  }, [tasks]);

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

  return (
    <div>
      <Link to="/goals" className="text-sm text-primary-400 hover:text-primary-600 mb-4 inline-block">
        ← Kembali ke Target
      </Link>

      {/* Goal Header */}
      <div className="card p-6 mb-6">
        {editing ? (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-primary-700 mb-2">Judul Goal</label>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-primary-700 mb-2">Deskripsi</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="input min-h-[80px]" rows={3} />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-primary-700 mb-2">Deadline</label>
              <input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} className="input" />
            </div>
            <div className="flex gap-3">
              <button onClick={cancelEditing} className="btn-secondary" disabled={saving}>Batal</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-primary-900">{goal.title}</h2>
                {goal.description && <p className="text-primary-500 mt-2">{goal.description}</p>}
              </div>
              <span className={`text-xs font-semibold uppercase px-3 py-1 rounded-full ${
                goal.status === 'active' ? 'bg-green-100 text-green-700' : goal.status === 'completed' ? 'bg-primary-100 text-primary-700' : 'bg-primary-50 text-primary-400'
              }`}>
                {goal.status === 'active' ? 'Aktif' : goal.status}
              </span>
            </div>
            {goal.deadline && (
              <p className="text-sm text-primary-400">
                📅 Deadline: {new Date(goal.deadline).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
            <div className="flex gap-2 mt-4 pt-4 border-t border-primary-100">
              <button onClick={startEditing} className="text-sm px-3 py-1.5 rounded bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors">
                ✏️ Edit Goal
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button onClick={handleDelete} disabled={deleting} className="text-sm px-3 py-1.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50">
                    {deleting ? 'Menghapus...' : 'Ya, Hapus'}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="text-sm px-3 py-1.5 rounded bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors">
                    Batal
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="text-sm px-3 py-1.5 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                  🗑️ Hapus Goal
                </button>
              )}
            </div>
          </>
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

      {/* Task List — grouped by date → slot */}
      {tasks.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="text-lg font-semibold text-primary-900 mb-2">Belum ada tugas</h3>
          <p className="text-primary-400 mb-4">Gunakan Coach untuk mendapatkan rekomendasi rencana belajar.</p>
          <Link to="/coach" className="btn-primary">Tanya Coach</Link>
        </div>
      ) : (
        <>
          {Object.entries(groupedTasks.byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, slotGroups]) => (
              <div key={date} className="mb-6">
                <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wide mb-3">
                  {new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                {['morning', 'afternoon', 'evening', 'unscheduled'].map((slot) => {
                  const slotTasks = slotGroups[slot];
                  if (!slotTasks || slotTasks.length === 0) return null;
                  const isFirst = slot === 'morning';
                  return (
                    <div key={slot}>
                      {slot !== 'unscheduled' && <SlotDivider slot={slot} first={isFirst} />}
                      <div className="space-y-3">
                        {slotTasks.map((task, i) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            index={i}
                            loading={actionLoading === task.id}
                            onComplete={handleComplete}
                            onModify={handleModify}
                            onSkip={handleSkip}
                            onClickTitle={openTaskDetail}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

          {groupedTasks.unassigned.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wide mb-3">
                Belum dijadwalkan
              </h3>
              <div className="space-y-3">
                {groupedTasks.unassigned.map((task, i) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={i}
                    loading={actionLoading === task.id}
                    onComplete={handleComplete}
                    onModify={handleModify}
                    onSkip={handleSkip}
                    onClickTitle={openTaskDetail}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <AdjustmentPanel />

      {/* Modals */}
      <ModifyTaskModal
        task={activeTask}
        isOpen={activeModal === 'modify'}
        onSave={confirmModify}
        onCancel={closeModal}
      />

      <SkipTaskModal
        task={activeTask}
        isOpen={activeModal === 'skip'}
        onConfirm={(params) => confirmSkip(params.reason, params.note)}
        onCancel={closeModal}
      />

      <FeedbackModal
        task={activeTask}
        isOpen={activeModal === 'feedback'}
        onConfirm={(params) => submitFeedback(params.difficulty, params.focus, params.notes)}
        onCancel={closeModal}
      />

      <TaskDetailModal
        task={detailTask}
        isOpen={!!detailTask}
        onClose={closeDetail}
        onSaveNotes={saveNotes}
      />

      <ProposalOverlay
        proposal={proposal}
        onAccept={acceptProposal}
        onReject={rejectProposal}
        accepting={proposalAccepting}
      />
    </div>
  );
}
