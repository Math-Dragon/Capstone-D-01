import { Skeleton, SkeletonCard } from '../../../components/ui/Skeleton';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../../components/ui/EmptyState';
import ProgressRing from './ProgressRing';
import EvidenceLog from './EvidenceLog';
import {
  TASK_TYPE_META,
  PERIOD_OPTIONS,
  PERIOD_LABELS,
  BUCKET_LABELS,
  formatDateRange,
  formatPercent,
  formatMinutes,
} from './progressMeta';

const INSIGHT_TONES = {
  positive: { label: 'Momentum baik', box: 'border-green-200 bg-green-50', labelClass: 'text-green-800', textClass: 'text-green-900' },
  neutral: { label: 'Berjalan stabil', box: 'border-primary-100 bg-primary-50', labelClass: 'text-primary-600', textClass: 'text-primary-900' },
  supportive: { label: 'Perlu perhatian', box: 'border-warm-200 bg-warm-50', labelClass: 'text-warm-700', textClass: 'text-primary-900' },
};

const MAX_ACTIVITY_BARS = 30;

function PeriodSelector({ period, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
      <span id="progress-period-label" className="text-sm font-medium text-primary-700">
        Periode
      </span>
      <div
        role="group"
        aria-labelledby="progress-period-label"
        className="inline-flex gap-1 rounded-xl border border-primary-200 bg-white p-1"
      >
        {PERIOD_OPTIONS.map((option) => {
          const active = period === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              aria-label={`${option.accessible} (${option.label})`}
              onClick={() => onChange(option.value)}
              className={`min-h-11 min-w-16 rounded-lg px-4 text-sm font-semibold transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
                ${active
                  ? 'bg-primary-900 text-white'
                  : 'text-primary-600 hover:bg-primary-50 hover:text-primary-900'}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PeriodMeta({ period, timezone }) {
  const key = period?.key;
  const cells = [
    { label: 'Periode', value: PERIOD_LABELS[key] || key || '–' },
    { label: 'Rentang', value: formatDateRange(period?.from, period?.to), note: BUCKET_LABELS[period?.bucket] || period?.bucket || null },
    { label: 'Zona waktu', value: timezone || '–' },
  ];

  return (
    <dl className="mb-6 grid gap-px overflow-hidden rounded-2xl border border-primary-100 bg-primary-100 shadow-soft sm:grid-cols-3">
      {cells.map((cell) => (
        <div key={cell.label} className="bg-white px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-primary-400">
            {cell.label}
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-primary-900">{cell.value}</dd>
          {cell.note && <dd className="text-xs text-primary-400">{cell.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

function InsightCallout({ insight }) {
  if (!insight) return null;
  const tone = INSIGHT_TONES[insight.tone] || INSIGHT_TONES.neutral;

  return (
    <div className={`rounded-xl border p-3 ${tone.box}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${tone.labelClass}`}>
        {tone.label}
      </p>
      <p className={`mt-1 text-sm leading-relaxed ${tone.textClass}`}>{insight.text}</p>
    </div>
  );
}

function StatGrid({ health }) {
  const cells = [
    {
      label: 'Tugas selesai',
      value: String(health.completed_tasks ?? 0),
      note: `dari ${health.total_tasks ?? 0} tugas terjadwal`,
    },
    {
      label: 'Waktu belajar',
      value: formatMinutes(health.completed_minutes),
      note: `target ${formatMinutes(health.planned_minutes)}`,
    },
    {
      label: 'Tingkat penyelesaian',
      value: formatPercent(health.completion_rate),
    },
    {
      label: 'Rata-rata kesulitan',
      value: health.average_difficulty != null ? `${Number(health.average_difficulty).toFixed(1)} / 5` : '–',
      note: `${health.difficulty_sample_count ?? 0} sampel feedback`,
    },
  ];

  return (
    <dl className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-primary-100 bg-primary-100 shadow-soft lg:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="bg-white px-4 py-4">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-primary-400">
            {cell.label}
          </dt>
          <dd className="mt-1 text-2xl font-bold text-primary-900">{cell.value}</dd>
          <dd className="mt-0.5 text-xs text-primary-400">{cell.note}</dd>
        </div>
      ))}
    </dl>
  );
}

function ActivityStrip({ activity }) {
  const buckets = (Array.isArray(activity) ? activity : []).slice(-MAX_ACTIVITY_BARS);
  if (buckets.length === 0) return null;

  const maxTasks = Math.max(1, ...buckets.map((bucket) => bucket.completed_tasks || 0));
  const first = buckets[0];
  const last = buckets[buckets.length - 1];

  return (
    <section aria-labelledby="activity-heading" className="mb-6 card p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 id="activity-heading" className="text-base font-semibold text-primary-900">
            Kegiatan harianmu
          </h3>
        </div>
        <p className="text-xs text-primary-400">
          {formatDateRange(first.from, last.to)}
          {buckets.length === MAX_ACTIVITY_BARS && ' · 30 hari terakhir'}
        </p>
      </div>

      <div className="flex h-24 items-end gap-[3px]" aria-hidden="true">
        {buckets.map((bucket, index) => {
          const tasks = bucket.completed_tasks || 0;
          const height = tasks > 0 ? Math.max(6, (tasks / maxTasks) * 100) : 3;
          return (
            <div
              key={`${bucket.from}-${index}`}
              className="min-w-0 flex-1 rounded-t-sm bg-primary-900 transition-all duration-500 hover:bg-primary-700"
              style={{ height: `${height}%` }}
              title={`${bucket.from}: ${tasks} tugas, ${bucket.completed_minutes || 0} menit`}
            />
          );
        })}
      </div>

      <ul className="sr-only">
        {buckets.map((bucket, index) => (
          <li key={`sr-${bucket.from}-${index}`}>
            {bucket.from}: {bucket.completed_tasks || 0} tugas selesai, {bucket.completed_minutes || 0} menit.
          </li>
        ))}
      </ul>
    </section>
  );
}

function Distribution({ distribution }) {
  const items = Array.isArray(distribution?.items) ? distribution.items : [];
  if (items.length === 0) return null;

  const maxCount = Math.max(1, ...items.map((item) => item.count || 0));

  return (
    <section aria-labelledby="distribution-heading" className="card p-5">
      <h3 id="distribution-heading" className="mb-4 text-base font-semibold text-primary-900">
        Jenis kegiatanmu
      </h3>

      <ul className="space-y-4">
        {items.map((item) => {
          const meta = TASK_TYPE_META[item.key] || { label: item.label || item.key, color: '#94A3B8', icon: '📌' };
          const label = item.label || meta.label;
          const width = Math.round(((item.count || 0) / maxCount) * 100);
          return (
            <li key={item.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span aria-hidden="true" className="text-sm">{meta.icon}</span>
                  <span className="truncate text-sm font-medium text-primary-700">{label}</span>
                </span>
                <span className="shrink-0 text-xs text-primary-400">
                  {item.count} tugas · {item.completed_count} selesai
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-primary-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${width}%`, backgroundColor: meta.color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CoachStrategy({ strategy }) {
  if (!strategy?.text) return null;

  return (
    <section aria-labelledby="strategy-heading" className="card p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 id="strategy-heading" className="text-sm font-semibold uppercase tracking-wide text-primary-900">
          Saran untukmu
        </h3>
      </div>
      <p className="text-sm leading-relaxed text-primary-500">{strategy.text}</p>
    </section>
  );
}

function LoadingState() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Memuat ringkasan progres…</span>
      <div className="mb-6 card p-6">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <Skeleton variant="circular" className="h-32 w-32" />
          <div className="w-full space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" variant="rectangular" />
          </div>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-primary-100 bg-primary-100">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-4">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-7 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <SkeletonCard />
    </div>
  );
}

export default function TrendTab({ overview, loading, error, onRetry, period, onPeriodChange }) {
  const health = overview?.health || {};
  const hasTasks = (health.total_tasks ?? 0) > 0;
  const hasDistribution = (overview?.distribution?.items?.length ?? 0) > 0;

  return (
    <div>
      <PeriodSelector period={period} onChange={onPeriodChange} />

      {loading && <LoadingState />}

      {!loading && error && (
        <ErrorState
          message="Gagal memuat ringkasan progres."
          helpText="Periksa koneksi, lalu coba ambil ulang data periode ini."          onRetry={onRetry}
        />
      )}

      {!loading && !error && overview && (
        <>
          <PeriodMeta period={overview.period} timezone={overview.timezone} />

          <div className="mb-6 card p-5 sm:p-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <ProgressRing percent={health.progress_percent} />
              <div className="w-full min-w-0 flex-1">
                <InsightCallout insight={overview.insight} />
              </div>
            </div>
          </div>

          <StatGrid health={health} />

          {!hasTasks && (
            <div className="mb-6">
              <EmptyState
                icon="📆"
                title="Belum ada tugas pada periode ini"
                description="Coba pilih periode lain, atau jadwalkan tugas lewat Kalender supaya perkembanganmu mulai terlihat."
              />
            </div>
          )}

          <ActivityStrip activity={overview.activity} />

          <div className={`mb-6 grid gap-6 ${hasDistribution ? 'lg:grid-cols-12' : ''}`}>
            {hasDistribution && (
              <div className="min-w-0 lg:col-span-7">
                <Distribution distribution={overview.distribution} />
              </div>
            )}
            <div className={`min-w-0 ${hasDistribution ? 'lg:col-span-5' : ''}`}>
              <EvidenceLog evidence={overview.evidence} />
            </div>
          </div>

          <CoachStrategy strategy={overview.coach_strategy} />
        </>
      )}
    </div>
  );
}
