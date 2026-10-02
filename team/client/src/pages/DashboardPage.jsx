import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import ProposalOverlay from '../features/coach/components/ProposalOverlay';
import proposalService from '../features/coach/services/proposalService';
import progressService from '../features/progress/services/progressService';
import api from '../services/api';
import { useAuth } from '../features/auth/hooks/useAuth';
import { onDataChanged } from '../utils/invalidation';
import { toDateKey } from '../utils/helpers';

const DashboardCharts = lazy(() => import('../components/DashboardCharts'));

const focusTypes = ['practice', 'synthesize', 'assess', 'interleave'];

// Label periode overview, dipakai sebagai cap ruang lingkup angka di ring.
const PERIOD_LABELS = { '7d': '7 hari terakhir', '30d': '30 hari terakhir', all: 'Semua waktu' };

const PROPOSAL_ERROR_TEXT = {
  PROPOSAL_STALE: 'Rencana sudah berubah. Muat ulang halaman untuk melihat versi terbarunya.',
  PROPOSAL_EXPIRED: 'Proposal ini sudah kedaluwarsa.',
  PROPOSAL_ALREADY_RESOLVED: 'Proposal ini sudah diputuskan sebelumnya.',
};

function periodLabelOf(period) {
  if (!period) return null;
  if (PERIOD_LABELS[period.key]) return PERIOD_LABELS[period.key];
  if (period.from && period.to) return `${period.from} - ${period.to}`;
  return period.key || null;
}

function expiryLabelOf(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `Berlaku sampai ${day}, ${time}`;
}

// Ringkasan minimum dari teaser overview, dipakai saat GET detail gagal
// supaya pengguna tetap bisa menerima/menolak lewat ID yang sama.
function minimalProposal(teaser) {
  return {
    id: teaser.id,
    summary: teaser.summary,
    base_plan_version: teaser.base_plan_version,
    evidence: [],
    changes: null,
  };
}

function CircularGauge({ pct }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={100} height={100} viewBox="0 0 64 64" className="shrink-0 drop-shadow-lg" role="img" aria-label={`Progres belajar ${pct} persen`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
      <circle
        cx="32" cy="32" r={r}
        fill="none" stroke="url(#gaugeGrad)" strokeWidth="5"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
        className="transition-all duration-700"
      />
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <text x="32" y="28" textAnchor="middle" fontSize="12" fill="#1e3a8a" fontWeight="bold">
        {pct}%
      </text>
      <text x="32" y="42" textAnchor="middle" fontSize="6" fill="#60a5fa" fontWeight="600" letterSpacing="1">
        PROGRESS
      </text>
    </svg>
  );
}

const STAT_CARDS = [
  {
    label: 'Tasks Done', icon: '✅', key: 'completedCount',
    border: 'border-l-green-500', gradient: 'from-green-50 to-white',
  },
  {
    label: 'In Progress', icon: '🔵', key: 'inProgressCount',
    border: 'border-l-blue-500', gradient: 'from-blue-50 to-white',
  },
  {
    label: 'Focus Points', icon: '💡', key: 'focusPointsCount',
    border: 'border-l-cyan-500', gradient: 'from-cyan-50 to-white',
  },
  {
    label: 'Urgent', icon: '⚡', key: 'urgentCount',
    border: 'border-l-amber-500', gradient: 'from-amber-50 to-white',
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Overview dijalankan terpisah dari tasks/goals: kegagalannya tidak boleh
  // menjatuhkan dashboard, cukup menurunkan state ke fallback lokal.
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState(false);

  const [overlayProposal, setOverlayProposal] = useState(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [proposalError, setProposalError] = useState(null);

  const today = toDateKey(new Date());

  const loadData = useCallback(async (signal) => {
    setOverviewError(false);
    // Async IIFE: `await` di sini menangkap rejection overview (termasuk
    // error sync) sehingga Promise.all tasks/goals tetap menentukan status halaman.
    const overviewResult = (async () => {
      try {
        return { ok: true, data: await progressService.getOverview('7d', { signal }) };
      } catch (err) {
        return { ok: false, err };
      }
    })();

    try {
      const [fetchedTasks, fetchedGoals, settledOverview] = await Promise.all([
        api.get('/tasks', { signal }),
        api.get('/goals', { signal }),
        overviewResult,
      ]);
      setTasks(Array.isArray(fetchedTasks) ? fetchedTasks : []);
      setGoals(Array.isArray(fetchedGoals) ? fetchedGoals : []);
      if (settledOverview.ok) {
        setOverview(settledOverview.data || null);
      } else {
        setOverview(null);
        if (settledOverview.err?.name !== 'AbortError') setOverviewError(true);
      }
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Gagal memuat data dashboard.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  useEffect(() => {
    return onDataChanged(() => loadData());
  }, [loadData]);

  const completedCount = useMemo(
    () => tasks.filter(t => t.status === 'done' || t.status === 'completed').length,
    [tasks]
  );
  const inProgressCount = useMemo(
    () => tasks.filter(t => t.status === 'in_progress').length,
    [tasks]
  );
  const focusPointsCount = useMemo(
    () => tasks.filter(t => focusTypes.includes(t.task_type)).length,
    [tasks]
  );
  const urgentCount = useMemo(
    () => tasks.filter(t => t.status === 'todo' && t.planned_date && t.planned_date <= today).length,
    [tasks, today]
  );
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const activeGoal = goals[0] || null;

  const statsMap = { completedCount, inProgressCount, focusPointsCount, urgentCount };

  const weeklyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ day: dayName, date: dateStr, count: 0 });
    }
    tasks.filter(t => t.completed_at).forEach(t => {
      const d = new Date(t.completed_at).toISOString().split('T')[0];
      const entry = days.find(dd => dd.date === d);
      if (entry) entry.count++;
    });
    return days;
  }, [tasks]);

  const priorityData = useMemo(() => {
    const grouped = { high: 0, medium: 0, low: 0 };
    tasks.forEach(t => {
      if (t.priority && Object.prototype.hasOwnProperty.call(grouped, t.priority)) {
        grouped[t.priority]++;
      }
    });
    const total = grouped.high + grouped.medium + grouped.low;
    if (total === 0) {
      return [{ name: 'No priority data', value: 1 }];
    }
    return [
      { name: 'High', value: grouped.high },
      { name: 'Medium', value: grouped.medium },
      { name: 'Low', value: grouped.low },
    ];
  }, [tasks]);

  const todayTasks = useMemo(
    () => tasks.filter(t => t.planned_date === today && t.status !== 'done' && t.status !== 'completed'),
    [tasks, today]
  );

  const allTodayDone = useMemo(() => {
    const todayAll = tasks.filter(t => t.planned_date === today);
    return todayAll.length > 0 && todayAll.every(t => t.status === 'done' || t.status === 'completed');
  }, [tasks, today]);

  const focusTasksTodayCount = useMemo(
    () => todayTasks.filter(t => focusTypes.includes(t.task_type)).length,
    [todayTasks]
  );

  const displayName = user?.email ? user.email.split('@')[0] : 'there';

  const pendingProposal = overview?.pending_proposal || null;
  const periodLabel = periodLabelOf(overview?.period);
  const timezoneLabel = overview?.timezone || null;
  const insightText = overview?.insight?.text || null;
  const strategyText = overview?.coach_strategy?.text || null;
  const expiryLabel = expiryLabelOf(pendingProposal?.expires_at);

  const closeProposal = useCallback(() => {
    setOverlayProposal(null);
    setProposalError(null);
  }, []);

  const openProposal = useCallback(async () => {
    if (!pendingProposal?.id) return;
    setProposalLoading(true);
    setProposalError(null);
    try {
      const detail = await proposalService.getById(pendingProposal.id);
      setOverlayProposal(detail || minimalProposal(pendingProposal));
    } catch {
      // Ringkasan teaser cukup untuk memutuskan; detail hanya pelengkap.
      setOverlayProposal(minimalProposal(pendingProposal));
      setProposalError('Detail proposal tidak dapat dimuat. Keputusan tetap bisa diambil di sini.');
    } finally {
      setProposalLoading(false);
    }
  }, [pendingProposal]);

  const handleAccept = useCallback(async () => {
    const id = overlayProposal?.id || pendingProposal?.id;
    if (!id) return;
    setAccepting(true);
    setProposalError(null);
    try {
      await proposalService.accept(id, {
        basePlanVersion: overlayProposal?.base_plan_version ?? pendingProposal?.base_plan_version,
        idempotencyKey: proposalService.newIdempotencyKey(),
      });
      setOverlayProposal(null);
      addToast('Rencana baru sudah diterapkan.', 'success');
      loadData();
    } catch (err) {
      const lifecycleText = PROPOSAL_ERROR_TEXT[err?.code];
      if (lifecycleText) {
        setOverlayProposal(null);
        addToast(lifecycleText, 'warning');
        loadData();
      } else {
        setProposalError(err?.message || 'Gagal menerima proposal. Coba lagi.');
      }
    } finally {
      setAccepting(false);
    }
  }, [overlayProposal, pendingProposal, addToast, loadData]);

  const handleReject = useCallback(async () => {
    const id = overlayProposal?.id || pendingProposal?.id;
    if (!id) return;
    setRejecting(true);
    setProposalError(null);
    try {
      await proposalService.reject(id, { idempotencyKey: proposalService.newIdempotencyKey() });
      setOverlayProposal(null);
      addToast('Proposal ditolak.', 'info');
      loadData();
    } catch (err) {
      const lifecycleText = PROPOSAL_ERROR_TEXT[err?.code];
      if (lifecycleText) {
        setOverlayProposal(null);
        addToast(lifecycleText, 'warning');
        loadData();
      } else {
        setProposalError(err?.message || 'Gagal menolak proposal. Coba lagi.');
      }
    } finally {
      setRejecting(false);
    }
  }, [overlayProposal, pendingProposal, addToast, loadData]);

  if (loading) {
    return (
      <div className="space-y-8" role="status" aria-live="polite" aria-busy="true">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-50 via-white to-accent-50/40 border border-primary-100/60 p-6 sm:p-8">
          <div className="flex gap-6">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton variant="circular" className="h-24 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20" role="alert" aria-live="assertive">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-primary-700 mb-2 text-center font-semibold">{error}</p>
        <p className="text-primary-500 mb-4 text-center text-sm">Periksa koneksi, lalu coba muat ulang data dashboard.</p>
        <button onClick={() => { setError(null); setLoading(true); loadData(); }} className="btn-primary">
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting + Gauge */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-50 via-white to-accent-50/40 border border-primary-100/60 p-6 sm:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-bold text-primary-900 mb-1">
              Hello, {displayName}! <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-accent-500" />
              <p className="text-primary-500 text-sm font-medium">
                Goal: {activeGoal?.title || '—'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center shrink-0 gap-2">
            <CircularGauge pct={progressPercent} />
            {(periodLabel || timezoneLabel) && (
              <p className="max-w-[7rem] text-center text-[11px] leading-tight text-primary-400">
                {periodLabel && (
                  <span className="block font-semibold text-primary-500">{periodLabel}</span>
                )}
                {timezoneLabel && <span className="block">{timezoneLabel}</span>}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Overview fallback: ringkasan 7 hari gagal, dashboard tetap jalan */}
      {overviewError && (
        <p role="status" className="rounded-xl border border-primary-100 bg-primary-50/70 px-4 py-3 text-xs text-primary-500">
          Ringkasan 7 hari belum bisa dimuat. Angka di bawah tetap dari tugasmu.
        </p>
      )}

      {/* Adaptive teaser: hanya muncul bila backend punya proposal pending */}
      {pendingProposal && (
        <section
          aria-labelledby="proposal-teaser-title"
          className="rounded-2xl border border-warm-200 bg-warm-50/50 p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <h3 id="proposal-teaser-title" className="text-sm font-bold text-primary-900">
                Ada saran untuk rencana belajarmu
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed break-words text-primary-600">
                {pendingProposal.summary}
              </p>
              {expiryLabel && (
                <p className="mt-2 text-xs font-medium text-primary-400">{expiryLabel}</p>
              )}
            </div>
            <button
              type="button"
              onClick={openProposal}
              disabled={proposalLoading}
              className="btn-primary min-h-11 w-full shrink-0 sm:w-auto"
            >
              {proposalLoading ? 'Memuat...' : 'Lihat saran'}
            </button>
          </div>
        </section>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-live="polite" aria-atomic="true">
        {STAT_CARDS.map(stat => (
          <div
            key={stat.label}
            className={`relative overflow-hidden bg-white rounded-2xl border border-primary-100/80 border-l-4 ${stat.border} p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-60`} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{stat.icon}</span>
                <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              <div className="text-3xl font-bold text-primary-900 tabular-nums">
                {statsMap[stat.key]}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sinyal perhatian dari overview: diringkas, tanpa evidence mentah */}
      {(insightText || strategyText) && (
        <section className={`grid gap-4 ${insightText && strategyText ? 'sm:grid-cols-2' : ''}`}>
          {insightText && (
            <article className="card p-5">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary-400">
                Ringkasan periode
              </h3>              <p className="text-sm leading-relaxed break-words text-primary-600">{insightText}</p>
            </article>
          )}
          {strategyText && (
            <article className="card p-5">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary-400">
                Strategi coach
              </h3>
              <p className="text-sm leading-relaxed break-words text-primary-600">{strategyText}</p>
            </article>
          )}
        </section>
      )}

      {/* Charts Row */}
      <Suspense fallback={<div className="grid lg:grid-cols-2 gap-6"><SkeletonCard /><SkeletonCard /></div>}>
        <DashboardCharts weeklyData={weeklyData} priorityData={priorityData} totalCount={totalCount} />
      </Suspense>

      {/* Focus Mode Card */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-warm-50 via-warm-50/80 to-amber-50/60 border border-warm-200 p-6 sm:p-8 shadow-sm">
        <div className="absolute top-0 right-0 w-40 h-40 bg-warm-200/30 rounded-full blur-2xl -translate-y-1/4 translate-x-1/4" />
        <div className="relative flex items-start gap-5">
          <div className="w-12 h-12 rounded-xl bg-warm-100 border border-warm-200 flex items-center justify-center text-2xl shrink-0 shadow-sm">
            ⚡
          </div>
          <div className="flex-1 min-w-0">
            {focusTasksTodayCount > 0 ? (
              <>
                <h3 className="font-bold text-primary-900 mb-2">Focus Mode</h3>
                <p className="text-primary-600 text-sm leading-relaxed">
                  Today you have <span className="font-bold text-warm-600">{focusTasksTodayCount}</span> task{focusTasksTodayCount > 1 ? 's' : ''} that require deep work. Start with the smallest step to build momentum.
                </p>
                <Link
                  to="/calendar"
                  className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-xl font-bold text-sm text-white bg-warm-600 hover:bg-warm-700 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  START SESSION
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </>
            ) : (
              <>
                <h3 className="font-bold text-primary-900 mb-2">Focus Mode</h3>
                <p className="text-primary-500 text-sm leading-relaxed">
                  No deep work tasks scheduled today. Plan your next session with{' '}
                  <Link to="/coach" className="text-warm-600 font-semibold underline hover:text-warm-700">Coach</Link>.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Up Next Today */}
      <section className="bg-white rounded-2xl border border-primary-100/80 p-6 shadow-sm" aria-live="polite" aria-atomic="true">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-primary-900">Up Next Today</h3>
          <span className="text-[10px] text-primary-400 font-semibold tracking-widest uppercase">
            Active Track
          </span>
        </div>

        <div className="mt-5">
          {todayTasks.length > 0 ? (
            <div className="space-y-2">
              {todayTasks.map(task => {
                const isOverdue = task.planned_date < today;
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-primary-50/60 border border-primary-100 hover:bg-primary-50 hover:border-primary-200 transition-all duration-200"
                  >
                    <span className={`w-3 h-3 rounded-full shrink-0 shadow-sm ${
                      isOverdue ? 'bg-red-500' : 'bg-green-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary-900 truncate leading-relaxed">
                        {task.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {task.task_type && (
                        <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest bg-primary-100/60 px-2 py-1 rounded-md">
                          {task.task_type}
                        </span>
                      )}
                      {task.planned_slot && (
                        <span className="text-xs font-medium text-primary-400 bg-primary-50 px-2.5 py-1 rounded-md border border-primary-100">
                          {task.planned_slot}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : allTodayDone ? (
            <div className="flex flex-col items-center justify-center py-10 rounded-xl bg-gradient-to-b from-green-50 to-white border border-green-100" role="status">
              <span className="text-4xl mb-3">🎉</span>
              <p className="text-lg font-bold text-primary-900">Semua tugas hari ini selesai!</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 rounded-xl bg-primary-50/60 border border-primary-100" role="status">
              <span className="text-4xl mb-3">📋</span>
              <p className="text-primary-500 font-medium mb-1">Tidak ada tugas hari ini.</p>
              <Link to="/coach" className="text-sm font-semibold text-primary-500 underline hover:text-primary-700 transition-colors">
                Tanya Coach untuk rencana baru →
              </Link>
            </div>
          )}
        </div>
      </section>

      <ProposalOverlay
        proposal={overlayProposal}
        onAccept={handleAccept}
        onReject={handleReject}
        onDismiss={closeProposal}
        accepting={accepting}
        rejecting={rejecting}
        error={proposalError}
      />
    </div>
  );
}
