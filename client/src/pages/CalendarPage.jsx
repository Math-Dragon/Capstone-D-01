import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStudentMetrics } from '../store/slices/observabilitySlice';
import api from '../services/api';
import useTaskActions from '../hooks/useTaskActions';
import TaskDetailModal from '../components/TaskDetailModal';
import TaskCard from '../components/TaskCard';
import SlotDivider from '../components/SlotDivider';
import StreakBadge from '../components/StreakBadge';
import AdjustmentPanel from '../components/AdjustmentPanel';
import ProposalOverlay from '../components/ProposalOverlay';
import ModifyTaskModal from '../components/ModifyTaskModal';
import SkipTaskModal from '../components/SkipTaskModal';
import FeedbackModal from '../components/FeedbackModal';
import { onDataChanged } from '../utils/invalidation';
import { SLOT_ORDER, TASK_TYPE_PALETTE } from '../utils/constants';
import { formatDuration } from '../utils/helpers';

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function getWeekDates(offset = 0) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

function formatWeekRange(dates) {
  if (!dates.length) return '';
  const start = new Date(dates[0] + 'T00:00:00');
  const end = new Date(dates[6] + 'T00:00:00');
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  const locale = 'id-ID';
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.toLocaleDateString(locale, opts)}`;
  }
  return `${start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(locale, opts)}`;
}

export default function CalendarPage() {
  const dispatch = useDispatch();
  const studentMetrics = useSelector((s) => s.observability.studentMetrics);
  const [subView, setSubView] = useState('today');
  const [weekOffset, setWeekOffset] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [rescheduleTask, setRescheduleTask] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleSlot, setRescheduleSlot] = useState('morning');

  const openTaskDetail = (task) => setDetailTask(task);
  const closeDetail = () => setDetailTask(null);
  const saveNotes = async (taskId, notes) => {
    try {
      await api.patch(`/tasks/${taskId}`, { personal_notes: notes });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, personal_notes: notes } : t));
    } catch (err) {
      console.error('Failed to save notes:', err);
    }
  };

  const {
    proposal, activeModal, activeTask, actionLoading, proposalAccepting,
    handleComplete, handleSkip, handleModify, handleFeedback,
    confirmSkip, confirmModify, submitFeedback,
    acceptProposal, rejectProposal, closeModal, handleModalConfirm,
  } = useTaskActions({
    onUpdateTasks: (updater) => setTasks(prev => updater(prev)),
    refreshData: async () => {
      const data = await api.get('/tasks');
      setTasks(Array.isArray(data) ? data : []);
    },
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const loadTasks = useCallback(async (signal) => {
    try {
      const data = await api.get('/tasks', { signal });
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadTasks(controller.signal);
    return () => controller.abort();
  }, [loadTasks]);
  useEffect(() => { dispatch(fetchStudentMetrics()); }, [dispatch]);

  useEffect(() => {
    const onFocus = () => { setLoading(true); loadTasks(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadTasks]);

  useEffect(() => {
    return onDataChanged(() => { setLoading(true); loadTasks(); });
  }, [loadTasks]);

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.planned_date) return;
      const d = t.planned_date.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => (SLOT_ORDER[a.planned_slot] ?? 1) - (SLOT_ORDER[b.planned_slot] ?? 1))
    );
    return map;
  }, [tasks]);

  const allDateKeys = useMemo(() => Object.keys(tasksByDate).sort(), [tasksByDate]);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const totalWeekMin = weekDates.reduce(
    (sum, d) => sum + (tasksByDate[d] || []).reduce((s, t) => s + (t.duration_estimate || 0), 0),
    0
  );

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done' || t.status === 'completed').length;
  const unassignedTasks = tasks.filter((t) => !t.planned_date).length;

  useEffect(() => {
    if (weekOffset === 0 && totalWeekMin === 0 && allDateKeys.length > 0) {
      const firstDate = allDateKeys[0];
      const firstWeek = Math.floor(
        (new Date(firstDate).getTime() - new Date(todayStr).getTime()) / (7 * 86400000)
      );
      if (firstWeek !== 0) setWeekOffset(firstWeek);
    }
  }, [totalWeekMin, weekOffset, allDateKeys, todayStr]);

  const displayDate = selectedDate || todayStr;

  const todayTasks = useMemo(() => {
    const dayTasks = tasksByDate[todayStr] || [];
    return {
      all: dayTasks,
      active: dayTasks.filter(t => t.status === 'todo' || t.status === 'in_progress'),
      completed: dayTasks.filter(t => t.status === 'done' || t.status === 'completed'),
    };
  }, [tasksByDate, todayStr]);

  const todayTasksBySlot = useMemo(() => {
    const map = {};
    todayTasks.active.forEach(t => {
      const slot = t.planned_slot || 'unscheduled';
      if (!map[slot]) map[slot] = [];
      map[slot].push(t);
    });
    return map;
  }, [todayTasks.active]);

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

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-900 mb-2">
          Jadwal Belajar
        </h2>
        <p className="text-primary-400">Lihat rencana belajarmu minggu ini.</p>
      </div>

      {/* Today / Week Segmented Control */}
      <div className="flex items-center gap-2 mb-6" role="tablist" aria-label="Pilih tampilan">
        <button
          role="tab"
          aria-selected={subView === 'today'}
          onClick={() => setSubView('today')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            subView === 'today'
              ? 'bg-primary-900 text-white shadow-sm'
              : 'bg-white text-primary-600 border border-primary-200 hover:bg-primary-50'
          }`}
        >
          Today
        </button>
        <button
          role="tab"
          aria-selected={subView === 'week'}
          onClick={() => setSubView('week')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            subView === 'week'
              ? 'bg-primary-900 text-white shadow-sm'
              : 'bg-white text-primary-600 border border-primary-200 hover:bg-primary-50'
          }`}
        >
          Week
        </button>
      </div>

      {/* ========= TODAY VIEW ========= */}
      {subView === 'today' && (
        <>
          {/* Stats row */}
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <StreakBadge streak={studentMetrics?.streak_days || 0} />
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-600 font-semibold">{todayTasks.completed.length} Selesai</span>
              <span className="text-primary-300">·</span>
              <span className="text-primary-600">{todayTasks.active.length} Terjadwal</span>
              <span className="text-primary-300">·</span>
              <span className="text-primary-400">{todayTasks.active.length > 0 ? todayTasks.active.length - todayTasks.completed.length : 0} Sisa</span>
            </div>
          </div>

          {/* Slot-grouped task list */}
          {todayTasks.active.length === 0 ? (
            <div className="card p-8 text-center mb-6">
              <div className="text-3xl mb-3">✅</div>
              <p className="text-primary-400">No tasks scheduled today. Enjoy your rest day.</p>
            </div>
          ) : (
            <div className="space-y-1 mb-6">
              {['morning', 'afternoon', 'evening'].map((slot) => {
                const slotTasks = todayTasksBySlot[slot];
                if (!slotTasks || slotTasks.length === 0) return null;
                const slotIndex = ['morning', 'afternoon', 'evening'].indexOf(slot);
                const isFirst = slotIndex === 0;
                return (
                  <div key={slot}>
                    <SlotDivider slot={slot} first={isFirst} />
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
          )}

          <AdjustmentPanel />
        </>
      )}

      {/* ========= WEEK VIEW ========= */}
      {subView === 'week' && (
        <>
          {/* Metrics bar */}
          {studentMetrics && (
            <div className="grid grid-cols-4 gap-2 mb-6">
              <div className="card p-2.5 text-center">
                <div className="text-lg font-bold text-amber-600">{studentMetrics.streak_days}</div>
                <div className="text-[9px] text-primary-400">Streak</div>
              </div>
              <div className="card p-2.5 text-center">
                <div className="text-lg font-bold text-primary-800">
                  {studentMetrics.completion_rate_7d > 0 ? `${Math.round(studentMetrics.completion_rate_7d * 100)}%` : '-'}
                </div>
                <div className="text-[9px] text-primary-400">Rasio</div>
              </div>
              <div className="card p-2.5 text-center">
                <div className="text-lg font-bold text-emerald-600">{studentMetrics.total_completed}</div>
                <div className="text-[9px] text-primary-400">Selesai</div>
              </div>
              <div className="card p-2.5 text-center">
                <div className="text-lg font-bold text-primary-600">
                  {studentMetrics.avg_difficulty_7d > 0 ? studentMetrics.avg_difficulty_7d.toFixed(1) : '-'}
                </div>
                <div className="text-[9px] text-primary-400">Kesulitan</div>
              </div>
            </div>
          )}

          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekOffset((p) => p - 1)}
              className="p-2 rounded-lg hover:bg-primary-100 text-primary-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-primary-900">
              {formatWeekRange(weekDates)}
            </span>
            <button
              onClick={() => setWeekOffset((p) => p + 1)}
              className="p-2 rounded-lg hover:bg-primary-100 text-primary-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {weekDates.map((date, i) => {
              const dayTasks = tasksByDate[date] || [];
              const isToday = date === todayStr;
              const isSelected = date === displayDate;
              const totalMin = dayTasks.reduce((s, t) => s + (t.duration_estimate || 0), 0);
              const completedCount = dayTasks.filter(t => t.status === 'done' || t.status === 'completed').length;

              return (
                <button
                  key={date}
                  onClick={() => { setSelectedDate(date); setSubView('today'); }}
                  className={`rounded-xl p-2 text-center transition-all duration-200 border ${
                    isSelected
                      ? 'border-primary-900 bg-primary-100 shadow-soft'
                      : isToday
                      ? 'border-accent-400 bg-accent-50'
                      : 'border-primary-100 bg-white hover:border-primary-200'
                  }`}
                  aria-label={`${DAY_NAMES[i]} ${new Date(date + 'T00:00:00').getDate()}, ${completedCount} dari ${dayTasks.length} tugas selesai`}
                >
                  <div className={`text-[11px] font-medium mb-1 ${isSelected ? 'text-primary-900' : isToday ? 'text-accent-600' : 'text-primary-400'}`}>
                    {DAY_NAMES[i]}
                  </div>
                  <div className={`text-lg font-bold mb-2 ${isSelected ? 'text-primary-900' : isToday ? 'text-accent-600' : 'text-primary-700'}`}>
                    {new Date(date + 'T00:00:00').getDate()}
                  </div>
                  {dayTasks.length > 0 ? (
                    <>
                      <div className="text-[10px] text-primary-400 mb-1">{formatDuration(totalMin)}</div>
                      {completedCount > 0 && (
                        <div className="text-[9px] text-green-600">{completedCount}/{dayTasks.length}</div>
                      )}
                    </>
                  ) : (
                    <div className="text-[10px] text-primary-300 italic">Rest</div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Week Summary */}
          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary-500">Total rencana minggu ini</span>
              <span className="text-sm font-semibold text-primary-900">{formatDuration(totalWeekMin)}</span>
            </div>
          </div>

          {/* Upcoming tasks section */}
          <div className="space-y-3">
            {weekDates.filter(d => d >= todayStr).map((date) => {
              const dayTasks = (tasksByDate[date] || []).filter(t => t.status === 'todo' || t.status === 'in_progress');
              if (dayTasks.length === 0) return null;
              return (
                <div key={date} className="mb-4">
                  <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wide mb-3">
                    {new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <div className="space-y-3">
                    {dayTasks.map((task, i) => (
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
        </>
      )}

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

      {/* Reschedule Modal */}
      {rescheduleModal()}
    </div>
  );

  function rescheduleModal() {
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${rescheduleTask ? '' : 'hidden'}`}>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setRescheduleTask(null)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Jadwal Ulang Tugas</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Tanggal</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Sesi</label>
                <select
                  value={rescheduleSlot}
                  onChange={(e) => setRescheduleSlot(e.target.value)}
                  className="input"
                >
                  <option value="morning">☀️ Pagi</option>
                  <option value="afternoon">⛅ Siang</option>
                  <option value="evening">🌙 Malam</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setRescheduleTask(null)} className="btn-secondary text-sm">Batal</button>
                <button
                  onClick={async () => {
                    if (!rescheduleTask) return;
                    try {
                      await api.patch(`/tasks/${rescheduleTask.id}`, {
                        planned_date: rescheduleDate,
                        planned_slot: rescheduleSlot,
                      });
                      setTasks(prev => prev.map(t => t.id === rescheduleTask.id ? { ...t, planned_date: rescheduleDate, planned_slot: rescheduleSlot } : t));
                      setRescheduleTask(null);
                    } catch (err) {
                      console.error('Failed to reschedule task:', err);
                    }
                  }}
                  className="btn-primary text-sm"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
