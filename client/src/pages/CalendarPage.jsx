import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useCoach } from '../features/coach/context/CoachContext';
import TaskActionModal from '../components/TaskActionModal';

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const SLOT_ORDER = { morning: 0, afternoon: 1, evening: 2 };
const SLOT_META = {
  morning: { icon: '☀️', label: 'Pagi' },
  afternoon: { icon: '⛅', label: 'Siang' },
  evening: { icon: '🌙', label: 'Malam' },
};
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

function formatDuration(min) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

function formatSlotLabel(slot) {
  const meta = SLOT_META[slot];
  return meta ? `${meta.icon} ${meta.label}` : slot;
}

export default function CalendarPage() {
  const coachCtx = useCoach();
  const [weekOffset, setWeekOffset] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
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

  const handleModalConfirm = async ({ action, reason, note, difficulty, focus, notes }) => {
    if (!modalTask) return;
    setActionLoading(modalTask.id);
    try {
      let result;
      if (action === 'complete') {
        result = await coachCtx.dispatchTaskAction('COMPLETE_TASK', { taskId: modalTask.id });
        setTasks((prev) =>
          prev.map((t) => (t.id === modalTask.id ? { ...t, status: 'done' } : t))
        );
      } else if (action === 'skip') {
        result = await coachCtx.dispatchTaskAction('SKIP_TASK', { taskId: modalTask.id, reason: reason || 'unspecified', note });
        setTasks((prev) =>
          prev.map((t) => (t.id === modalTask.id ? { ...t, status: 'skipped' } : t))
        );
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

  const todayStr = new Date().toISOString().split('T')[0];

  const loadTasks = useCallback(async () => {
    try {
      const data = await api.get('/tasks');
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    const onFocus = () => { setLoading(true); loadTasks(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
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
  const displayTasks = (tasksByDate[displayDate] || []).filter(
    (t) => t.status === 'todo'
  );

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-900 mb-2">
          Jadwal Belajar
        </h2>
        <p className="text-primary-400">Lihat rencana belajarmu minggu ini.</p>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-primary-900">{totalTasks}</div>
          <div className="text-[10px] text-primary-400">Total Tugas</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-green-600">{completedTasks}</div>
          <div className="text-[10px] text-primary-400">Selesai</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-xl font-bold text-primary-900">{totalTasks - completedTasks}</div>
          <div className="text-[10px] text-primary-400">{unassignedTasks > 0 ? `${unassignedTasks} belum dijadwalkan` : 'Tersisa'}</div>
        </div>
      </div>

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
        <div className="text-center">
          <span className="text-sm font-semibold text-primary-900">
            {formatWeekRange(weekDates)}
          </span>
        </div>
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
          const completedCount = dayTasks.filter(
            (t) => t.status === 'done' || t.status === 'completed'
          ).length;

          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`rounded-xl p-2 text-center transition-all duration-200 border ${
                isSelected
                  ? 'border-primary-900 bg-primary-100 shadow-soft'
                  : isToday
                  ? 'border-accent-400 bg-accent-50'
                  : 'border-primary-100 bg-white hover:border-primary-200'
              }`}
            >
              <div
                className={`text-[11px] font-medium mb-1 ${
                  isSelected ? 'text-primary-900' : isToday ? 'text-accent-600' : 'text-primary-400'
                }`}
              >
                {DAY_NAMES[i]}
              </div>
              <div
                className={`text-lg font-bold mb-2 ${
                  isSelected ? 'text-primary-900' : isToday ? 'text-accent-600' : 'text-primary-700'
                }`}
              >
                {new Date(date + 'T00:00:00').getDate()}
              </div>
              {dayTasks.length > 0 ? (
                <>
                  <div className="text-[10px] text-primary-400 mb-1">
                    {formatDuration(totalMin)}
                  </div>
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {dayTasks.slice(0, 6).map((t) => (
                      <span
                        key={t.id}
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{
                          backgroundColor:
                            t.status === 'done' || t.status === 'completed'
                              ? '#22C55E'
                              : TASK_TYPE_COLORS[t.task_type] || '#94A3B8',
                        }}
                      />
                    ))}
                  </div>
                  {completedCount > 0 && (
                    <div className="text-[9px] text-green-600 mt-1">
                      {completedCount}/{dayTasks.length}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-[10px] text-primary-300">
                  {totalTasks === 0 ? 'Kosong' : '-'}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Week Summary */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-primary-500">Total rencana minggu ini</span>
          <span className="text-sm font-semibold text-primary-900">
            {formatDuration(totalWeekMin)}
          </span>
        </div>
      </div>

      {/* Day Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary-900">
            Tugas {new Date(displayDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs text-primary-400 hover:text-primary-600 transition-colors"
            >
              Kembali ke hari ini
            </button>
          )}
        </div>

        {displayTasks.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="text-3xl mb-3">✅</div>
            <p className="text-primary-400">
              {displayDate === todayStr
                ? 'Semua tugas hari ini sudah selesai!'
                : 'Tidak ada tugas terjadwal untuk hari ini.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayTasks.map((task) => {
              const color = TASK_TYPE_COLORS[task.task_type] || '#94A3B8';
              return (
                <div
                  key={task.id}
                  className="card p-4 border-l-4"
                  style={{ borderLeftColor: color }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {task.planned_slot && (
                          <span className="text-xs text-primary-400">
                            {formatSlotLabel(task.planned_slot)}
                          </span>
                        )}
                        <span className="text-xs text-primary-300">·</span>
                        <span className="text-xs font-medium text-primary-900">
                          {task.duration_estimate}m
                        </span>
                      </div>
                      <h4 className="font-medium text-sm text-primary-900">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-primary-400 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: color + '22',
                          color,
                        }}
                      >
                        {task.task_type || 'task'}
                      </span>
                      {task.status !== 'done' && task.status !== 'completed' && task.status !== 'skipped' && (
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
        )}
      </div>

      <TaskActionModal
        task={modalTask}
        mode={modalMode}
        onConfirm={handleModalConfirm}
        onCancel={closeModal}
      />

      {/* Coach Toast */}
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
