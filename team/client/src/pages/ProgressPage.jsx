import { useState, useEffect, useMemo, useCallback } from 'react';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import api from '../services/api';

const TASK_TYPE_META = {
  acquire: { label: 'Acquire', color: '#818CF8', icon: '📖' },
  practice: { label: 'Practice', color: '#F0A500', icon: '✏️' },
  recall: { label: 'Recall', color: '#EC4899', icon: '🧠' },
  interleave: { label: 'Interleave', color: '#06B6D4', icon: '🔀' },
  synthesize: { label: 'Synthesize', color: '#A78BFA', icon: '🔗' },
  review: { label: 'Review', color: '#34D399', icon: '🔄' },
  assess: { label: 'Assess', color: '#F87171', icon: '📋' },
  reflect: { label: 'Reflect', color: '#94A3B8', icon: '💬' },
};

function ProgressRing({ percent, size = 120, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto block"
      role="img"
      aria-label={`Progress ${percent}% selesai`}
      aria-live="polite"
    >
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#0f172a" strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
      <text
        x={size / 2} y={size / 2 - 6}
        textAnchor="middle" fill="#0f172a"
        fontSize="28" fontWeight="700" fontFamily="Inter, sans-serif"
      >
        {percent}%
      </text>
      <text
        x={size / 2} y={size / 2 + 14}
        textAnchor="middle" fill="#94a3b8"
        fontSize="10" fontFamily="Inter, sans-serif"
      >
        selesai
      </text>
    </svg>
  );
}

export default function ProgressPage() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProgress = useCallback(async (signal) => {
    setLoading(true);
    try {
      const [taskData, statsData] = await Promise.all([
        api.get('/tasks', { signal }),
        api.get('/progress/stats', { signal }),
      ]);
      setTasks(Array.isArray(taskData) ? taskData : []);
      setStats(statsData);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Gagal memuat data progres. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadProgress(controller.signal);
    return () => controller.abort();
  }, [loadProgress]);

  const computed = useMemo(() => {
    const completed = tasks.filter(
      (t) => t.status === 'done' || t.status === 'completed'
    );
    const total = tasks.length;
    const totalMin = tasks.reduce((s, t) => s + (t.duration_estimate || 0), 0);
    const completedMin = completed.reduce((s, t) => s + (t.duration_estimate || 0), 0);
    const pct = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    const typeCounts = {};
    tasks.forEach((t) => {
      const type = t.task_type || 'other';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    return { completed: completed.length, total, totalMin, completedMin, pct, typeCounts };
  }, [tasks]);

  if (loading) {
    return (
      <div role="status" aria-live="polite" aria-busy="true">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="card p-8 mb-6 flex justify-center">
          <Skeleton variant="circular" className="h-32 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20" role="alert" aria-live="assertive">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-primary-700 mb-2 text-center font-semibold">{error}</p>
        <p className="text-primary-500 mb-4 text-center text-sm">Periksa koneksi, lalu coba ambil ulang ringkasan progres.</p>
        <button onClick={() => loadProgress()} className="btn-primary">
          Coba Lagi
        </button>
      </div>
    );
  }

  const typeEntries = Object.entries(computed.typeCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-primary-900 mb-2">
          Analisis Progres
        </h2>
        <p className="text-primary-400">Lihat pencapaian dan tren belajarmu.</p>
      </div>

      {computed.total === 0 && (
        <div className="card p-8 mb-6 text-center" role="status" aria-live="polite">
          <h3 className="text-lg font-semibold text-primary-900 mb-2">Belum ada data progres</h3>
          <p className="text-primary-500">Selesaikan atau jadwalkan task terlebih dahulu agar grafik progres bisa dihitung.</p>
        </div>
      )}

      {/* Progress Ring */}
<<<<<<< HEAD
      <div className="card p-8 mb-6" aria-live="polite" aria-atomic="true">
=======
      <div className="card p-8 mb-6" aria-live="polite">
>>>>>>> dev
        <div className="text-center">
          <ProgressRing percent={computed.pct} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs text-primary-400 mb-1">Tugas Selesai</div>
          <div className="text-xl font-bold text-primary-900">
            {computed.completed}
            <span className="text-sm font-normal text-primary-400"> / {computed.total}</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-primary-400 mb-1">Waktu Terpakai</div>
          <div className="text-xl font-bold text-primary-900">
            {computed.completedMin}m
            <span className="text-sm font-normal text-primary-400"> / {computed.totalMin}m</span>
          </div>
        </div>
        {stats && (
          <>
            <div className="card p-4">
              <div className="text-xs text-primary-400 mb-1">Tingkat Penyelesaian</div>
              <div className="text-xl font-bold text-primary-900">
                {stats.completionRate != null
                  ? `${Math.round(stats.completionRate * 100)}%`
                  : '–'}
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-primary-400 mb-1">Rata-rata Kesulitan</div>
              <div className="text-xl font-bold text-primary-900">
                {stats.avgDifficulty != null
                  ? `${stats.avgDifficulty.toFixed(1)} / 5`
                  : '–'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Task Distribution */}
      {typeEntries.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="font-semibold text-primary-900 mb-4">Distribusi Tugas</h3>
          <div className="space-y-3">
            {typeEntries.map(([type, count]) => {
              const meta = TASK_TYPE_META[type] || {
                label: type,
                color: '#94A3B8',
                icon: '📌',
              };
              const barPct = Math.round((count / computed.total) * 100);
              return (
                <div key={type} className="flex items-center gap-3">
                  <div className="w-6 text-center text-sm">{meta.icon}</div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-medium text-primary-700">
                        {meta.label}
                      </span>
                      <span className="text-xs text-primary-400">
                        {count} tugas
                      </span>
                    </div>
                    <div className="h-1.5 bg-primary-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barPct}%`, backgroundColor: meta.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Coach Strategy */}
      {stats?.summary && (
        <div className="card p-5 mb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-primary-900 mb-2">
            Strategi Coach
          </h4>
          <p className="text-sm text-primary-500 leading-relaxed">{stats.summary}</p>
        </div>
      )}

      {/* Adaptation Notes */}
      {stats?.adaptationNotes && (
        <div className="card p-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">
            Catatan Adaptasi
          </h4>
          <p className="text-sm text-primary-500 leading-relaxed">{stats.adaptationNotes}</p>
        </div>
      )}
    </div>
  );
}
