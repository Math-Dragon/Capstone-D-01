import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
const SLOT_KEYS = ['morning', 'afternoon', 'evening', 'unscheduled'];
const SLOT_ACCESSIBLE_LABELS = {
  morning: 'Pagi',
  afternoon: 'Siang',
  evening: 'Malam',
  unscheduled: 'Belum dijadwalkan',
};
const STATUS_FILTERS = [
  { value: 'all', label: 'Semua status' },
  { value: 'active', label: 'Aktif' },
  { value: 'done', label: 'Selesai' },
  { value: 'skipped', label: 'Dilewati' },
];
const SOURCE_FILTERS = [
  { value: 'all', label: 'Semua sumber' },
  { value: 'ai', label: 'AI' },
  { value: 'manual', label: 'Manual' },
  { value: 'coach', label: 'Coach' },
];
const TASK_TYPE_OPTIONS = Object.keys(TASK_TYPE_PALETTE);
const DAILY_LOAD_LIMIT_MIN = 180;
const TASK_LOAD_TIMEOUT_MS = 6000;

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromDateKey(date) {
  return new Date(date + 'T00:00:00');
}

function isSameMonth(date, monthDate) {
  const dateObj = fromDateKey(date);
  return dateObj.getMonth() === monthDate.getMonth() && dateObj.getFullYear() === monthDate.getFullYear();
}

function getWeekDates(offset = 0) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(toDateKey(d));
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

function getMonthDates(offset = 0) {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - ((firstOfMonth.getDay() + 6) % 7));
  const dates = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(toDateKey(d));
  }
  return dates;
}

function formatMonthLabel(offset = 0) {
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return month.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function formatLongDate(date) {
  return fromDateKey(date).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function groupTasksBySlot(dayTasks) {
  return dayTasks.reduce((acc, task) => {
    const slot = task.planned_slot || 'unscheduled';
    if (!acc[slot]) acc[slot] = [];
    acc[slot].push(task);
    return acc;
  }, {});
}

function isActiveTask(task) {
  return task.status === 'todo' || task.status === 'in_progress';
}

function isDoneTask(task) {
  return task.status === 'done' || task.status === 'completed';
}

function toMetricNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getWeekdayName(date) {
  return fromDateKey(date).toLocaleDateString('id-ID', { weekday: 'long' });
}

function getActiveTasksForDate(taskList, date) {
  return taskList.filter((task) => task.planned_date?.slice(0, 10) === date && isActiveTask(task));
}

function focusCalendarDate(date) {
  document.querySelector(`[data-calendar-date="${date}"]`)?.focus();
}

function buildPlanEditAdvice({ type, task, date, slot, previousTasks, nextTasks }) {
  const targetTasksBefore = getActiveTasksForDate(previousTasks, date);
  const targetTasksAfter = getActiveTasksForDate(nextTasks, date);
  const targetMin = targetTasksAfter.reduce((sum, item) => sum + (item.duration_estimate || 0), 0);
  const dayName = getWeekdayName(date);
  const suggestions = [];

  if (type === 'manual') {
    suggestions.push(`Task baru masuk ke ${dayName}. Cek apakah durasinya masih realistis untuk hari itu.`);
  } else if (targetTasksBefore.length === 0) {
    suggestions.push(`${dayName} masih kosong sebelum perubahan, jadi jadwal ini aman untuk dicoba.`);
  } else {
    suggestions.push(`${dayName} sudah punya ${targetTasksBefore.length} task sebelum perubahan. Pastikan beban belajarnya masih nyaman.`);
  }

  if (targetMin > DAILY_LOAD_LIMIT_MIN) {
    suggestions.push(`${dayName} menjadi cukup padat (${formatDuration(targetMin)}). Pertimbangkan pindah sebagian task ke hari lain.`);
  }

  const sameSlotCount = targetTasksAfter.filter((item) => (item.planned_slot || 'morning') === (slot || 'morning')).length;
  if (sameSlotCount > 1) {
    suggestions.push(`${SLOT_ACCESSIBLE_LABELS[slot || 'morning']} punya ${sameSlotCount} task. Slot lain mungkin lebih lega.`);
  }

  return {
    title: type === 'manual' ? 'Task manual ditambahkan' : 'Plan berubah',
    taskTitle: task?.title || 'Task',
    date,
    slot: slot || 'morning',
    suggestions,
  };
}

export default function CalendarPage() {
  const dispatch = useDispatch();
  const studentMetrics = useSelector((s) => s.observability.studentMetrics);
  const taskLoadSeq = useRef(0);
  const [subView, setSubView] = useState('day');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [manualTaskTitle, setManualTaskTitle] = useState('');
  const [manualTaskDuration, setManualTaskDuration] = useState(30);
  const [manualTaskSlot, setManualTaskSlot] = useState('morning');
  const [calendarNotice, setCalendarNotice] = useState('');
  const [planAdvice, setPlanAdvice] = useState(null);
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiAdviceLoading, setAiAdviceLoading] = useState(false);

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

  const todayStr = toDateKey(new Date());
  const displayDate = selectedDate || todayStr;

  const loadTasks = useCallback(async (signal, options = {}) => {
    const { showLoading = false, clearOnError = false } = options;
    const loadSeq = taskLoadSeq.current + 1;
    taskLoadSeq.current = loadSeq;
    const controller = new AbortController();
    let timeoutId;

    const abortFromParent = () => controller.abort();
    if (signal) {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', abortFromParent, { once: true });
    }

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = window.setTimeout(() => {
        controller.abort();
        const err = new Error('Memuat kalender terlalu lama.');
        err.name = 'TimeoutError';
        reject(err);
      }, TASK_LOAD_TIMEOUT_MS);
    });

    if (showLoading) setLoading(true);

    try {
      const data = await Promise.race([
        api.get('/tasks', { signal: controller.signal, timeout: TASK_LOAD_TIMEOUT_MS }),
        timeoutPromise,
      ]);
      if (taskLoadSeq.current !== loadSeq || controller.signal.aborted) return;
      setTasks(Array.isArray(data) ? data : []);
      setCalendarNotice('');
    } catch (err) {
      if (taskLoadSeq.current !== loadSeq || signal?.aborted) return;
      if (clearOnError) setTasks([]);
      setCalendarNotice(err?.name === 'TimeoutError'
        ? 'Data kalender butuh waktu lebih lama dari biasanya. Kalender tetap dibuka, coba refresh jika data belum muncul.'
        : 'Data kalender belum berhasil dimuat. Coba refresh halaman atau login ulang jika data masih kosong.');
    } finally {
      window.clearTimeout(timeoutId);
      if (signal) signal.removeEventListener('abort', abortFromParent);
      if (taskLoadSeq.current === loadSeq && !signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadTasks(controller.signal, { showLoading: true, clearOnError: true });
    return () => controller.abort();
  }, [loadTasks]);
  useEffect(() => { dispatch(fetchStudentMetrics()); }, [dispatch]);

  useEffect(() => {
    const onFocus = () => { loadTasks(undefined, { showLoading: false, clearOnError: false }); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadTasks]);

  useEffect(() => {
    return onDataChanged(() => { loadTasks(undefined, { showLoading: false, clearOnError: false }); });
  }, [loadTasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (typeFilter !== 'all' && task.task_type !== typeFilter) return false;
      if (sourceFilter !== 'all' && task.source !== sourceFilter) return false;
      if (statusFilter === 'active' && !isActiveTask(task)) return false;
      if (statusFilter === 'done' && !isDoneTask(task)) return false;
      if (statusFilter === 'skipped' && task.status !== 'skipped') return false;
      return true;
    });
  }, [tasks, typeFilter, sourceFilter, statusFilter]);

  const tasksByDate = useMemo(() => {
    const map = {};
    filteredTasks.forEach((t) => {
      if (!t.planned_date) return;
      const d = t.planned_date.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => (SLOT_ORDER[a.planned_slot] ?? 1) - (SLOT_ORDER[b.planned_slot] ?? 1))
    );
    return map;
  }, [filteredTasks]);

  const allDateKeys = useMemo(() => Object.keys(tasksByDate).sort(), [tasksByDate]);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const monthDates = useMemo(() => getMonthDates(monthOffset), [monthOffset]);
  const visibleMonth = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);
  const totalWeekMin = weekDates.reduce(
    (sum, d) => sum + (tasksByDate[d] || []).reduce((s, t) => s + (t.duration_estimate || 0), 0),
    0
  );

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(isDoneTask).length;
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

  const todayTasks = useMemo(() => {
    const dayTasks = tasksByDate[displayDate] || [];
    return {
      all: dayTasks,
      active: dayTasks.filter(isActiveTask),
      completed: dayTasks.filter(isDoneTask),
    };
  }, [tasksByDate, displayDate]);

  const todayTasksBySlot = useMemo(() => {
    const map = {};
    todayTasks.active.forEach(t => {
      const slot = t.planned_slot || 'unscheduled';
      if (!map[slot]) map[slot] = [];
      map[slot].push(t);
    });
    return map;
  }, [todayTasks.active]);

  const visibleGoalId = useMemo(() => tasks.find((task) => task.goal_id)?.goal_id || null, [tasks]);
  const skippedTasks = useMemo(() => tasks.filter((task) => task.status === 'skipped'), [tasks]);
  const metrics = useMemo(() => ({
    streakDays: toMetricNumber(studentMetrics?.streak_days),
    completionRate7d: toMetricNumber(studentMetrics?.completion_rate_7d),
    totalCompleted: toMetricNumber(studentMetrics?.total_completed),
    avgDifficulty7d: toMetricNumber(studentMetrics?.avg_difficulty_7d),
  }), [studentMetrics]);

  const weekSummary = useMemo(() => {
    const weekTasks = weekDates.flatMap((date) => tasksByDate[date] || []);
    const activeWeekTasks = weekTasks.filter(isActiveTask);
    return {
      total: weekTasks.length,
      active: activeWeekTasks.length,
      completed: weekTasks.filter(isDoneTask).length,
      duration: activeWeekTasks.reduce((sum, task) => sum + (task.duration_estimate || 0), 0),
    };
  }, [tasksByDate, weekDates]);

  const calendarWarnings = useMemo(() => {
    const warnings = [];
    weekDates.forEach((date) => {
      const activeTasks = (tasksByDate[date] || []).filter(isActiveTask);
      const totalMin = activeTasks.reduce((sum, task) => sum + (task.duration_estimate || 0), 0);
      if (totalMin > DAILY_LOAD_LIMIT_MIN) {
        warnings.push(`${getWeekdayName(date)} terlalu padat (${formatDuration(totalMin)})`);
      }
      const slotGroups = groupTasksBySlot(activeTasks);
      Object.entries(slotGroups).forEach(([slot, slotTasks]) => {
        if (slot !== 'unscheduled' && slotTasks.length > 1) {
          warnings.push(`${SLOT_ACCESSIBLE_LABELS[slot]} punya ${slotTasks.length} tugas pada ${getWeekdayName(date)}`);
        }
      });
    });
    return warnings;
  }, [tasksByDate, weekDates]);

  const handleTaskDrop = async (event, date) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain');
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const patch = {
      planned_date: date,
      planned_slot: task.planned_slot || 'morning',
    };
    try {
      const updated = await api.patch(`/tasks/${task.id}`, patch);
      setTasks((prev) => {
        const next = prev.map((item) => item.id === task.id ? { ...item, ...updated, ...patch } : item);
        setPlanAdvice(buildPlanEditAdvice({
          type: 'move',
          task,
          date,
          slot: patch.planned_slot,
          previousTasks: prev,
          nextTasks: next,
        }));
        setAiAdvice('');
        return next;
      });
      setCalendarNotice(`"${task.title}" dipindahkan ke ${formatLongDate(date)}.`);
    } catch (err) {
      setCalendarNotice(err.message || 'Gagal memindahkan task.');
    }
  };

  const handleManualTaskSubmit = async (event) => {
    event.preventDefault();
    if (!manualTaskTitle.trim() || !visibleGoalId) return;
    const payload = {
      goal_id: visibleGoalId,
      title: manualTaskTitle.trim(),
      description: '',
      duration_estimate: Number(manualTaskDuration),
      planned_date: displayDate,
      planned_slot: manualTaskSlot,
    };
    try {
      const created = await api.post('/tasks', payload);
      setTasks((prev) => {
        const next = [...prev, created];
        setPlanAdvice(buildPlanEditAdvice({
          type: 'manual',
          task: created,
          date: payload.planned_date,
          slot: payload.planned_slot,
          previousTasks: prev,
          nextTasks: next,
        }));
        setAiAdvice('');
        return next;
      });
      setManualTaskTitle('');
      setManualTaskDuration(30);
      setManualTaskSlot('morning');
      setManualFormOpen(false);
      setCalendarNotice('Task manual berhasil ditambahkan ke kalender.');
    } catch (err) {
      setCalendarNotice(err.message || 'Gagal menambahkan task manual.');
    }
  };

  const handleRescheduleTomorrow = async (task) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDate = toDateKey(tomorrow);
    const patch = {
      status: 'todo',
      planned_date: nextDate,
      planned_slot: task.planned_slot || 'morning',
    };
    try {
      const updated = await api.patch(`/tasks/${task.id}`, patch);
      setTasks((prev) => {
        const next = prev.map((item) => item.id === task.id ? { ...item, ...updated, ...patch } : item);
        setPlanAdvice(buildPlanEditAdvice({
          type: 'reschedule',
          task,
          date: nextDate,
          slot: patch.planned_slot,
          previousTasks: prev,
          nextTasks: next,
        }));
        setAiAdvice('');
        return next;
      });
      setCalendarNotice(`"${task.title}" dijadwalkan ulang ke besok.`);
    } catch (err) {
      setCalendarNotice(err.message || 'Gagal menjadwalkan ulang task.');
    }
  };

  const requestAiPlanAdvice = async () => {
    if (!planAdvice) return;
    setAiAdviceLoading(true);
    try {
      const result = await api.post('/coach', {
        action: 'REQUEST_ADJUSTMENT',
        payload: {
          type: 'plan_edit_advice',
          message: `Berikan saran singkat untuk perubahan plan task "${planAdvice.taskTitle}" pada ${formatLongDate(planAdvice.date)} slot ${planAdvice.slot}. Jangan terapkan perubahan otomatis.`,
          change: {
            task_title: planAdvice.taskTitle,
            planned_date: planAdvice.date,
            planned_slot: planAdvice.slot,
          },
          local_suggestions: planAdvice.suggestions,
        },
      });
      setAiAdvice(result?.message || result?.summary || 'AI sudah memberi saran, tetapi tidak ada detail tambahan.');
    } catch (err) {
      setAiAdvice(err.message || 'AI belum bisa memberi saran saat ini.');
    } finally {
      setAiAdviceLoading(false);
    }
  };

  const retryLoadTasks = () => {
    loadTasks(undefined, { showLoading: true, clearOnError: true });
  };

  const handleCalendarKeyDown = (event, dates, index) => {
    const date = dates[index];
    const focusByIndex = (nextIndex) => {
      event.preventDefault();
      focusCalendarDate(dates[nextIndex]);
    };

    if (event.key === 'ArrowRight') {
      focusByIndex(Math.min(index + 1, dates.length - 1));
    } else if (event.key === 'ArrowLeft') {
      focusByIndex(Math.max(index - 1, 0));
    } else if (event.key === 'Home') {
      focusByIndex(0);
    } else if (event.key === 'End') {
      focusByIndex(dates.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedDate(date);
      setSubView('day');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin h-8 w-8 text-primary-500" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-sm font-medium text-primary-500">Memuat kalender...</p>
        </div>
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

      {/* Calendar view segmented control */}
      <div className="flex items-center gap-2 mb-6" role="tablist" aria-label="Pilih tampilan">
        <button
          role="tab"
          aria-selected={subView === 'day'}
          onClick={() => { setSelectedDate(null); setSubView('day'); }}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            subView === 'day'
              ? 'bg-primary-900 text-white shadow-sm'
              : 'bg-white text-primary-600 border border-primary-200 hover:bg-primary-50'
          }`}
        >
          Hari
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
          Minggu
        </button>
        <button
          role="tab"
          aria-selected={subView === 'month'}
          onClick={() => setSubView('month')}
          className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
            subView === 'month'
              ? 'bg-primary-900 text-white shadow-sm'
              : 'bg-white text-primary-600 border border-primary-200 hover:bg-primary-50'
          }`}
        >
          Bulan
        </button>
      </div>

      {calendarNotice && (
        <div className="card p-3 mb-4 text-sm text-primary-700 bg-primary-50 border-primary-100" role="status" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Info kalender</p>
              <p>{calendarNotice}</p>
              <p className="text-xs text-primary-500 mt-1">Jika data belum muncul, periksa koneksi atau login ulang.</p>
            </div>
            <button type="button" onClick={retryLoadTasks} className="btn-secondary shrink-0 text-xs px-3 py-2" aria-label="Coba lagi memuat kalender">
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div>
            <h3 className="text-sm font-semibold text-primary-900">Ringkasan planner</h3>
            <p className="text-xs text-primary-400">
              {weekSummary.active} aktif - {weekSummary.completed} selesai - {formatDuration(weekSummary.duration)}
            </p>
            <p className="text-[11px] text-primary-300 mt-1">
              {completedTasks}/{totalTasks} task selesai dalam filter aktif - {unassignedTasks} belum terjadwal
            </p>
          </div>
          <button
            type="button"
            onClick={() => setManualFormOpen((open) => !open)}
            disabled={!visibleGoalId}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            Tambah task manual
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs font-medium text-primary-500">
            Filter tipe task
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="input mt-1 text-sm"
            >
              <option value="all">Semua tipe</option>
              {TASK_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-primary-500">
            Filter status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="input mt-1 text-sm"
            >
              {STATUS_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-primary-500">
            Filter sumber
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="input mt-1 text-sm"
            >
              {SOURCE_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>
          </label>
        </div>

        {manualFormOpen && (
          <form onSubmit={handleManualTaskSubmit} className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="text-xs font-medium text-primary-500 sm:col-span-2">
              Judul task
              <input
                value={manualTaskTitle}
                onChange={(event) => setManualTaskTitle(event.target.value)}
                className="input mt-1 text-sm"
                placeholder="Contoh: Review materi React"
              />
            </label>
            <label className="text-xs font-medium text-primary-500">
              Durasi
              <input
                type="number"
                min="25"
                max="90"
                step="5"
                value={manualTaskDuration}
                onChange={(event) => setManualTaskDuration(event.target.value)}
                className="input mt-1 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-primary-500">
              Sesi belajar
              <select
                value={manualTaskSlot}
                onChange={(event) => setManualTaskSlot(event.target.value)}
                className="input mt-1 text-sm"
              >
                <option value="morning">Pagi</option>
                <option value="afternoon">Siang</option>
                <option value="evening">Malam</option>
              </select>
            </label>
            <div className="sm:col-span-4 flex justify-end">
              <button type="submit" className="btn-primary text-sm" disabled={!manualTaskTitle.trim() || !visibleGoalId}>
                Simpan task
              </button>
            </div>
          </form>
        )}

        {calendarWarnings.length > 0 && (
          <div className="mt-4 space-y-2" aria-label="Peringatan planner">
            {calendarWarnings.map((warning) => (
              <p key={warning} className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                {warning}
              </p>
            ))}
          </div>
        )}

        {skippedTasks.length > 0 && (
          <div className="mt-4 border-t border-primary-100 pt-3">
            <p className="text-xs font-semibold text-primary-500 mb-2">Task perlu dijadwalkan ulang</p>
            <div className="flex flex-wrap gap-2">
              {skippedTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => handleRescheduleTomorrow(task)}
                  className="text-xs px-3 py-2 rounded-lg bg-white border border-primary-200 text-primary-600 hover:bg-primary-50"
                >
                  Jadwalkan besok: {task.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {planAdvice && (
          <div className="mt-4 border-t border-primary-100 pt-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-sm font-semibold text-primary-900">Saran perubahan plan</h4>
                <p className="text-xs text-primary-400">
                  {planAdvice.taskTitle} - {formatLongDate(planAdvice.date)} - {SLOT_ACCESSIBLE_LABELS[planAdvice.slot]}
                </p>
              </div>
              <button
                type="button"
                onClick={requestAiPlanAdvice}
                disabled={aiAdviceLoading}
                className="btn-secondary text-sm disabled:opacity-50"
              >
                {aiAdviceLoading ? 'Meminta saran...' : 'Minta saran AI'}
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {planAdvice.suggestions.map((suggestion) => (
                <p key={suggestion} className="text-xs text-primary-600 bg-white border border-primary-100 rounded-lg px-3 py-2">
                  {suggestion}
                </p>
              ))}
            </div>
            {aiAdvice && (
              <div className="mt-3 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
                <p className="text-xs font-semibold text-primary-700 mb-1">Saran AI</p>
                <p className="text-sm text-primary-700">{aiAdvice}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========= DAY VIEW ========= */}
      {subView === 'day' && (
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
            <div className="card p-8 text-center mb-6" role="status" aria-live="polite">
              <div className="text-3xl mb-3">✅</div>
              <h3 className="text-lg font-semibold text-primary-900 mb-2">Tidak ada tugas terjadwal</h3>
              <p className="text-primary-500 mb-4">Hari ini masih kosong. Tambahkan task manual atau minta Coach membuat rencana baru.</p>
              <button type="button" onClick={() => setManualFormOpen(true)} className="btn-secondary" aria-label="Buat task dari empty state kalender">
                Buat task pertama
              </button>
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
                        <div
                          key={task.id}
                          draggable
                          role="listitem"
                          tabIndex={0}
                          aria-label={`Pindahkan ${task.title}`}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              openTaskDetail(task);
                            }
                          }}
                          onDragStart={(event) => event.dataTransfer.setData('text/plain', task.id)}
                        >
                          <TaskCard
                            task={task}
                            index={i}
                            loading={actionLoading === task.id}
                            onComplete={handleComplete}
                            onModify={handleModify}
                            onSkip={handleSkip}
                            onClickTitle={openTaskDetail}
                          />
                        </div>
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
                <div className="text-lg font-bold text-amber-600">{metrics.streakDays}</div>
                <div className="text-[9px] text-primary-400">Streak</div>
              </div>
              <div className="card p-2.5 text-center">
                <div className="text-lg font-bold text-primary-800">
                  {metrics.completionRate7d > 0 ? `${Math.round(metrics.completionRate7d * 100)}%` : '-'}
                </div>
                <div className="text-[9px] text-primary-400">Rasio</div>
              </div>
              <div className="card p-2.5 text-center">
                <div className="text-lg font-bold text-emerald-600">{metrics.totalCompleted}</div>
                <div className="text-[9px] text-primary-400">Selesai</div>
              </div>
              <div className="card p-2.5 text-center">
                <div className="text-lg font-bold text-primary-600">
                  {metrics.avgDifficulty7d > 0 ? metrics.avgDifficulty7d.toFixed(1) : '-'}
                </div>
                <div className="text-[9px] text-primary-400">Kesulitan</div>
              </div>
            </div>
          )}

          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekOffset((p) => p - 1)}
              aria-label="Minggu sebelumnya"
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
              aria-label="Minggu berikutnya"
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
                  onClick={() => { setSelectedDate(selectedDate === date ? null : date); }}
                  onKeyDown={(event) => handleCalendarKeyDown(event, weekDates, i)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleTaskDrop(event, date)}
                  data-calendar-date={date}
                  className={`rounded-xl p-2 text-center transition-all duration-200 border ${
                    isSelected
                      ? 'border-primary-900 bg-primary-100 shadow-soft'
                      : isToday
                      ? 'border-accent-400 bg-accent-50'
                      : 'border-primary-100 bg-white hover:border-primary-200'
                  }`}
                  aria-label={`${DAY_NAMES[i]} ${new Date(date + 'T00:00:00').getDate()}, ${completedCount} dari ${dayTasks.length} tugas selesai`}
                  aria-pressed={isSelected}
                  aria-current={isToday ? 'date' : undefined}
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

          {/* Week tasks section */}
          <div className="space-y-3">
            {weekDates.filter(d => selectedDate ? d === selectedDate : true).map((date) => {
              const dayTasks = (tasksByDate[date] || []).filter(t => t.status === 'todo' || t.status === 'in_progress');
              if (dayTasks.length === 0) return null;
              const slotGroups = groupTasksBySlot(dayTasks);
              return (
                <section key={date} className="mb-4" aria-label={formatLongDate(date)}>
                  <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wide mb-3">
                    {formatLongDate(date)}
                  </h3>
                  {SLOT_KEYS.map((slot) => {
                    const slotTasks = slotGroups[slot];
                    if (!slotTasks || slotTasks.length === 0) return null;
                    return (
                      <div key={slot} role="group" aria-label={SLOT_ACCESSIBLE_LABELS[slot]}>
                        {slot !== 'unscheduled' && <SlotDivider slot={slot} first={slot === 'morning'} />}
                        <div className="space-y-3">
                          {slotTasks.map((task, i) => (
                            <div
                              key={task.id}
                              draggable
                              role="listitem"
                              tabIndex={0}
                              aria-label={`Pindahkan ${task.title}`}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  openTaskDetail(task);
                                }
                              }}
                              onDragStart={(event) => event.dataTransfer.setData('text/plain', task.id)}
                            >
                              <TaskCard
                                task={task}
                                index={i}
                                loading={actionLoading === task.id}
                                onComplete={handleComplete}
                                onModify={handleModify}
                                onSkip={handleSkip}
                                onClickTitle={openTaskDetail}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </>
      )}

      {/* ========= MONTH VIEW ========= */}
      {subView === 'month' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setMonthOffset((p) => p - 1)}
              aria-label="Bulan sebelumnya"
              className="p-2 rounded-lg hover:bg-primary-100 text-primary-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-primary-900 capitalize">
              {formatMonthLabel(monthOffset)}
            </span>
            <button
              onClick={() => setMonthOffset((p) => p + 1)}
              aria-label="Bulan berikutnya"
              className="p-2 rounded-lg hover:bg-primary-100 text-primary-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-3">
            {DAY_NAMES.map((day) => (
              <div key={day} className="text-center text-[11px] font-semibold text-primary-400 uppercase">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 mb-6">
            {monthDates.map((date, i) => {
              const dayTasks = tasksByDate[date] || [];
              const isToday = date === todayStr;
              const isSelected = date === displayDate;
              const isCurrentMonth = isSameMonth(date, visibleMonth);
              const totalMin = dayTasks.reduce((s, t) => s + (t.duration_estimate || 0), 0);

              return (
                <button
                  key={date}
                  onClick={() => { setSelectedDate(date); setSubView('day'); }}
                  onKeyDown={(event) => handleCalendarKeyDown(event, monthDates, i)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleTaskDrop(event, date)}
                  data-calendar-date={date}
                  className={`min-h-20 rounded-xl p-2 text-left transition-all duration-200 border ${
                    isSelected
                      ? 'border-primary-900 bg-primary-100 shadow-soft'
                      : isToday
                      ? 'border-accent-400 bg-accent-50'
                      : 'border-primary-100 bg-white hover:border-primary-200'
                  } ${isCurrentMonth ? '' : 'opacity-45'}`}
                  aria-label={`${formatLongDate(date)}, ${dayTasks.length} tugas`}
                  aria-pressed={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                >
                  <div className={`text-sm font-bold ${isToday ? 'text-accent-600' : 'text-primary-700'}`}>
                    {new Date(date + 'T00:00:00').getDate()}
                  </div>
                  {dayTasks.length > 0 ? (
                    <div className="mt-2">
                      <div className="text-[10px] font-semibold text-primary-600">
                        {dayTasks.length} tugas
                      </div>
                      <div className="text-[10px] text-primary-400">{formatDuration(totalMin)}</div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-primary-300 italic mt-2">Rest</div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="card p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-primary-500">Total tugas bulan ini</span>
              <span className="text-sm font-semibold text-primary-900">
                {monthDates
                  .filter((date) => isSameMonth(date, visibleMonth))
                  .reduce((sum, date) => sum + (tasksByDate[date]?.length || 0), 0)}
              </span>
            </div>
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
    </div>
  );
}
