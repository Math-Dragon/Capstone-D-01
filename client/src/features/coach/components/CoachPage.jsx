import { useState, useRef, useEffect } from 'react';
import { useCoach } from '../hooks/useCoach';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import CoachObservability from './CoachObservability';
import AdaptationBanner from '../../../components/AdaptationBanner';
import AdjustmentPanel from '../../../components/AdjustmentPanel';
import useFocusTrap from '../../../hooks/useFocusTrap';

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-white border border-primary-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-soft">
        <div className="flex gap-1.5 items-center">
          <span className="w-2 h-2 bg-primary-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-primary-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-primary-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function RoutineAdjustmentCard({ notes }) {
  return (
    <div
      className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3"
      role="complementary"
      aria-label="Penyesuaian rencana"
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 mb-1">
        ⚡ Penyesuaian Rencana
      </div>
      <p className="text-xs text-amber-800">{notes || 'Rencana telah disesuaikan secara otomatis.'}</p>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isSystem = msg.role === 'system';
  const isStudent = msg.role === 'student';
  const time = new Date(msg.timestamp).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSystem) {
    return (
      <div className="flex justify-center mb-2 animate-fade-in">
        <span className="text-[11px] text-primary-400 bg-primary-50 px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isStudent ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in`}>
      <div className={`max-w-[80%] ${isStudent ? 'ml-8' : 'mr-8'}`}>
        <div
          className={`px-4 py-3 text-sm leading-relaxed ${
            isStudent
              ? 'bg-primary-900 text-white rounded-2xl rounded-br-sm'
              : msg.isError
              ? 'bg-red-50 border border-red-200 text-red-700 rounded-2xl rounded-bl-sm'
              : 'bg-white border border-primary-100 text-primary-800 rounded-2xl rounded-bl-sm shadow-soft'
          }`}
        >
          {msg.content}
          {msg.adaptationType === 'adjustment' && (
            <RoutineAdjustmentCard notes={msg.adaptationNotes} />
          )}
        </div>
        <div className={`mt-1 flex items-center gap-2 ${isStudent ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-primary-300">{time}</span>
        </div>
        {msg.planSnapshot && (
          <div className="mt-2 bg-accent-50 border border-accent-200 rounded-xl p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-accent-700 mb-1">
              Rencana Diperbarui
            </div>
            {msg.plan?.adaptation_notes && (
              <p className="text-xs text-accent-700 mb-2 italic">{msg.plan.adaptation_notes}</p>
            )}
            <p className="text-xs text-primary-600">{msg.planSnapshot}</p>
            <Link
              to="/calendar"
              className="text-xs font-medium text-primary-900 hover:underline mt-1 inline-block"
            >
              Lihat rencana →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

const DAY_LABELS = {
  mon: 'Sen', tue: 'Sel', wed: 'Rab', thu: 'Kam',
  fri: 'Jum', sat: 'Sab', sun: 'Min',
};

const ALL_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const WEEKENDS = ['sat', 'sun'];

function PlanFormModal({ onSubmit, onCancel, disabled, initialPayload }) {
  const modalRef = useRef(null);
  useFocusTrap(modalRef, true);
  const [title, setTitle] = useState(initialPayload?.goal?.title || '');
  const [description, setDescription] = useState(initialPayload?.goal?.description || '');
  const [deadline, setDeadline] = useState(initialPayload?.goal?.deadline || '');
  const [weeklyHours, setWeeklyHours] = useState(initialPayload?.profile?.weekly_target_hours || 5);
  const [preferredTime, setPreferredTime] = useState(initialPayload?.profile?.preferred_time || 'morning');

  const [availMode, setAvailMode] = useState('weekdays');
  const [availDays, setAvailDays] = useState(WEEKDAYS);

  const handleModeChange = (mode) => {
    setAvailMode(mode);
    if (mode === 'weekdays') setAvailDays(WEEKDAYS);
    else if (mode === 'weekend') setAvailDays(WEEKENDS);
  };

  const toggleDay = (day) => {
    if (availMode !== 'custom') return;
    setAvailDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || disabled) return;
    onSubmit({
      goal: { title: title.trim(), description: description.trim(), deadline: deadline || null },
      profile: {
        weekly_target_hours: weeklyHours,
        preferred_time: preferredTime,
        availability: availDays,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <span className="text-lg">🎯</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary-900">Buat Rencana Belajar</h3>
              <p className="text-xs text-primary-400">Isi form untuk mendapatkan rekomendasi AI</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-primary-400 hover:text-primary-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">
              Judul Tujuan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Menguasai React.js"
              className="input"
              required
              disabled={disabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan tujuan belajarmu..."
              className="input min-h-[60px]"
              rows={2}
              disabled={disabled}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">Deadline</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input"
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">Jam Belajar / Minggu</label>
              <input
                type="number"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(Number(e.target.value))}
                min={1}
                max={40}
                className="input"
                disabled={disabled}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">Waktu Preferensi</label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="input"
                disabled={disabled}
              >
                <option value="morning">Pagi</option>
                <option value="afternoon">Siang</option>
                <option value="evening">Malam</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">Hari Belajar</label>
            <div className="flex gap-2 mb-3">
              {Object.entries({ weekdays: 'Weekdays (Sen–Jum)', weekend: 'Weekend (Sab–Min)', custom: 'Custom' }).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleModeChange(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    availMode === key ? 'bg-primary-900 text-white' : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {ALL_DAYS.map((day) => {
                const checked = availDays.includes(day);
                const locked = availMode !== 'custom';
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    disabled={locked}
                    className={`w-10 h-10 rounded-xl text-xs font-semibold transition-all ${
                      checked
                        ? locked ? 'bg-primary-200 text-primary-800 cursor-not-allowed' : 'bg-primary-900 text-white'
                        : 'bg-primary-50 text-primary-400 hover:bg-primary-100'
                    } disabled:opacity-70`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                );
              })}
            </div>
            {availMode === 'custom' && availDays.length === 0 && (
              <p className="text-[11px] text-red-500 mt-1">Pilih minimal 1 hari</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!title.trim() || disabled || (availMode === 'custom' && availDays.length === 0)}
            className="btn-primary w-full !py-2.5 !rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Buat Rencana
          </button>
        </form>
      </div>
    </div>
  );
}

function TaskCard({ task, onDecide, onViolationAccept }) {
  const slotLabels = { morning: 'Pagi', afternoon: 'Siang', evening: 'Malam' };
  const hasViolation = !!task.violation;

  const handleAccept = () => {
    if (hasViolation) {
      onViolationAccept(task);
    } else {
      onDecide(task.taskId, 'accepted');
    }
  };

  return (
    <div className={`bg-white rounded-xl p-4 shadow-soft ${hasViolation ? 'border border-amber-300' : 'border border-primary-100'}`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-primary-900 flex-1">{task.title}</h4>
        <div className="flex gap-1.5 ml-2 shrink-0 items-center">
          {task.duration_estimate && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              hasViolation && task.violation.field === 'duration_estimate'
                ? 'bg-amber-100 text-red-600 font-semibold'
                : 'bg-primary-100 text-primary-600'
            }`}>
              {task.duration_estimate}m
            </span>
          )}
          {hasViolation && (
            <span className="text-amber-500 text-sm" title={task.violation.message}>⚠</span>
          )}
          {task.planned_slot && (
            <span className="text-[10px] px-2 py-0.5 bg-accent-100 text-accent-600 rounded-full">
              {slotLabels[task.planned_slot] || task.planned_slot}
            </span>
          )}
        </div>
      </div>
      {task.rationale && <p className="text-xs text-primary-400 italic mb-3">{task.rationale}</p>}
      <div className="flex gap-2 justify-end">
        {task.status === 'pending' ? (
          <>
            <button
              onClick={() => onDecide(task.taskId, 'rejected')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              aria-label={`Tolak tugas: ${task.title}`}
            >
              ✕ Tolak
            </button>
            <button
              onClick={handleAccept}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
              aria-label={`Terima tugas: ${task.title}`}
            >
              ✓ Terima
            </button>
          </>
        ) : (
          <span className={`text-xs px-2 py-1 rounded-full ${task.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {task.status === 'accepted' ? 'Diterima' : 'Ditolak'}
          </span>
        )}
      </div>
    </div>
  );
}

function ViolationAdjustModal({ task, onAdjust, onSkip, onCancel }) {
  const modalRef = useRef(null);
  useFocusTrap(modalRef, true);
  const violation = task.violation;
  if (!violation) return null;

  const isTooBig = violation.constraint === 'max:90';
  const bound = isTooBig ? 90 : 25;
  const direction = isTooBig ? 'melebihi batas maksimal' : 'di bawah batas minimal';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <span className="text-lg">⚠️</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-primary-900">Durasi Tugas</h3>
            <p className="text-xs text-primary-400">{task.title}</p>
          </div>
        </div>

        <p className="text-sm text-primary-700 mb-4">
          Durasi <span className="font-semibold text-red-600">{violation.value} menit</span> {direction} {bound} menit.
        </p>

        <p className="text-xs text-primary-400 mb-5">
          {isTooBig
            ? 'Tugas yang terlalu panjang dapat mengurangi efektivitas belajar.'
            : 'Tugas yang terlalu pendek mungkin kurang memberikan tantangan.'}
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onAdjust(task.taskId, { duration_estimate: bound })}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            Sesuaikan ke {bound} menit
          </button>
          <button
            onClick={() => onSkip(task.taskId)}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            Lewati tugas ini
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-primary-400 hover:text-primary-600 transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

function RecommendationPanel({ recommendation, onDecide }) {
  const decidedCount = recommendation.tasks.filter((t) => t.status !== 'pending').length;
  const totalTasks = recommendation.tasks.length;
  const [violationModalTask, setViolationModalTask] = useState(null);

  const handleViolationAccept = (task) => {
    setViolationModalTask(task);
  };

  const handleAdjust = (taskId, overrides) => {
    onDecide(taskId, 'accepted', overrides);
    setViolationModalTask(null);
  };

  const handleSkipFromViolation = (taskId) => {
    onDecide(taskId, 'rejected');
    setViolationModalTask(null);
  };

  const handleCancelViolation = () => {
    setViolationModalTask(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary-50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-primary-900 mb-1">Rekomendasi Rencana</h3>
        <p className="text-xs text-primary-600">{recommendation.summary}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 bg-primary-200 rounded-full h-1.5">
            <div className="bg-primary-900 h-1.5 rounded-full transition-all" style={{ width: `${(decidedCount / totalTasks) * 100}%` }} />
          </div>
          <span className="text-[10px] text-primary-500">{decidedCount} dari {totalTasks} diputuskan</span>
        </div>
      </div>
      <div className="space-y-3">
        {recommendation.tasks.map((task) => (
          <TaskCard key={task.taskId} task={task} onDecide={onDecide} onViolationAccept={handleViolationAccept} />
        ))}
      </div>

      {violationModalTask && (
        <ViolationAdjustModal
          task={violationModalTask}
          onAdjust={handleAdjust}
          onSkip={handleSkipFromViolation}
          onCancel={handleCancelViolation}
        />
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mb-4 animate-pulse">
        <span className="text-2xl">🎓</span>
      </div>
      <h3 className="text-base font-semibold text-primary-900 mb-2">Membuat rencana belajar...</h3>
      <p className="text-sm text-primary-400 mb-4">Coach sedang menyiapkan rekomendasi untukmu</p>
      <div className="w-48 bg-primary-100 rounded-full h-1.5">
        <div className="bg-primary-900 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
      </div>
    </div>
  );
}

function ErrorView({ error, onRetry, onEditForm }) {
  const message = error?.code === 20 || error?.message?.includes('aborted')
    ? 'Waktu permintaan habis. Server membutuhkan waktu lebih lama dari biasanya.'
    : error?.message || 'Terjadi kesalahan saat membuat rencana.';

  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-primary-900 mb-2">Gagal Membuat Rencana</h3>
      <p className="text-sm text-primary-400 max-w-xs text-center leading-relaxed mb-6">{message}</p>
      <div className="flex gap-3">
        <button onClick={onEditForm} className="btn-secondary !px-5 !py-2.5 !rounded-xl text-sm">Ubah Formulir</button>
        <button onClick={onRetry} className="btn-primary !px-5 !py-2.5 !rounded-xl text-sm">Coba Lagi</button>
      </div>
    </div>
  );
}

export default function CoachPage() {
  const { messages, status, sendMessage, generatePlan, retryGeneratePlan, getLastPayload, decideTask, mode, recommendation, error, banner, pipelineTrace, observabilityRefresh, trimmedTasks, dismissTrimmed } = useCoach();
  const [input, setInput] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [adjustmentExpanded, setAdjustmentExpanded] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    if (searchParams.get('create') === 'true' && (mode === 'form' || mode === 'chat')) {
      setFormOpen(true);
      navigate(location.pathname, { replace: true });
    }
  }, [searchParams, mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || status === 'loading') return;
    sendMessage(input.trim());
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFormSubmit = (payload) => {
    setFormOpen(false);
    generatePlan(payload);
  };

  const handleRetry = () => retryGeneratePlan();
  const handleEditForm = () => setFormOpen(true);

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-900 mb-2">AI Learning Coach</h2>
          <p className="text-primary-400">
            {mode === 'recommendation'
              ? 'Tinjau rekomendasi rencana belajar di bawah.'
              : mode === 'error'
              ? 'Terjadi kesalahan saat membuat rencana.'
              : 'Tanya apa saja tentang rencana belajarmu.'}
          </p>
        </div>
        {(mode === 'chat' || mode === 'form') && (
          <button
            onClick={() => setFormOpen(true)}
            className="btn-primary !px-4 !py-2 !rounded-xl text-sm shrink-0 ml-4"
          >
            Buat Rencana Belajar
          </button>
        )}
      </div>

      {formOpen && (
        <PlanFormModal
          onSubmit={handleFormSubmit}
          onCancel={() => setFormOpen(false)}
          disabled={status === 'loading'}
          initialPayload={getLastPayload()}
        />
      )}

      {banner && <div className="mb-4"><AdaptationBanner /></div>}
      {trimmedTasks && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 text-sm">📐</span>
            <p className="text-xs text-amber-800">
              {trimmedTasks.count} tugas dipangkas agar sesuai jadwal mingguanmu.
            </p>
          </div>
          <button
            onClick={dismissTrimmed}
            className="text-amber-400 hover:text-amber-600 shrink-0 ml-3"
            aria-label="Tutup notifikasi"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {mode === 'loading' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <LoadingSkeleton />
        </div>
      )}

      {mode === 'error' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <ErrorView error={error} onRetry={handleRetry} onEditForm={handleEditForm} />
        </div>
      )}

      {mode === 'recommendation' && recommendation && (
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <RecommendationPanel recommendation={recommendation} onDecide={decideTask} />
        </div>
      )}

      {mode !== 'loading' && mode !== 'recommendation' && mode !== 'error' && (
        <div className="flex-1 overflow-y-auto min-h-0 mb-4 pr-1">
          {messages.length === 0 && status !== 'loading' ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
                <span className="text-2xl">🎓</span>
              </div>
              <h3 className="text-base font-semibold text-primary-900 mb-2">Coach Belajar Kamu</h3>
              <p className="text-sm text-primary-400 max-w-xs leading-relaxed mb-4">
                Mulai dengan membuat rencana belajar yang dipersonalisasi, atau tanya apa saja.
              </p>
              {mode === 'form' && (
                <button onClick={() => setFormOpen(true)} className="btn-primary !px-6 !py-2.5 !rounded-xl text-sm">
                  Buat Rencana Belajar
                </button>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {status === 'loading' && <TypingIndicator />}

              {/* Adjustment Panel in chat area */}
              {mode === 'chat' && messages.length > 0 && (
                <div className="mt-4 pt-3 border-t border-primary-100">
                  <button
                    type="button"
                    onClick={() => setAdjustmentExpanded(!adjustmentExpanded)}
                    className="text-xs font-semibold text-primary-500 hover:text-primary-700 transition-colors flex items-center gap-1"
                  >
                    <svg className={`w-3.5 h-3.5 transition-transform ${adjustmentExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Pengaturan Cepat {adjustmentExpanded ? '▲' : '▶'}
                  </button>
                  {adjustmentExpanded && <AdjustmentPanel />}
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      )}

      {mode !== 'loading' && mode !== 'recommendation' && mode !== 'error' && (
        <div className="flex gap-2 pt-3 border-t border-primary-100">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tulis pesan untuk coach..."
            disabled={status === 'loading'}
            className="input flex-1 !py-2.5 !text-sm !rounded-xl disabled:opacity-50"
            aria-label="Tulis pesan untuk coach"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || status === 'loading'}
            className="btn-primary !px-4 !py-2.5 !rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Kirim pesan"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      )}

      <CoachObservability pipelineTrace={pipelineTrace} onRefresh={observabilityRefresh} />
    </div>
  );
}
