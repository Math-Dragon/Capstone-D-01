import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoals } from '../context/GoalsContext';
import GoalCard from './GoalCard';
import { SkeletonList } from '../../../components/ui/Skeleton';

export default function GoalsPage() {
  const { goals, loading, error, refresh } = useGoals();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredGoals = goals.filter(g => {
    const matchesSearch = !debouncedSearch
      || g.title.toLowerCase().includes(debouncedSearch.toLowerCase())
      || (g.description || '').toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (error) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-primary-900 mb-8">Target Belajar</h2>
        <div className="card p-8 text-center" role="alert" aria-live="assertive">
          <p className="text-red-600 font-semibold mb-2">{error}</p>
          <p className="text-primary-500 text-sm mb-4">Data target belum bisa dimuat. Periksa koneksi, lalu coba lagi.</p>
          <button onClick={refresh} className="btn-secondary">Coba Lagi</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-primary-900">Target Belajar</h2>
        <button onClick={() => navigate('/coach?create=true')} className="btn-primary">
          + Tambah Goal
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari goal..."
            className="input pl-10"
            aria-label="Cari goal"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-full sm:w-auto"
          aria-label="Filter status"
        >
          <option value="all">Semua</option>
          <option value="active">Aktif</option>
          <option value="completed">Selesai</option>
          <option value="paused">Ditunda</option>
        </select>
      </div>

      {loading ? (
        <div role="status" aria-live="polite" aria-label="Memuat daftar goal">
          <SkeletonList count={6} />
        </div>
      ) : filteredGoals.length === 0 && goals.length > 0 ? (
        <div className="card p-12 text-center" role="status" aria-live="polite">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary-400">Filter</div>
          <h3 className="text-xl font-semibold text-primary-900 mb-2">Tidak ada goal yang cocok</h3>
          <p className="text-primary-500 mb-6">Coba ubah kata kunci atau filter status.</p>
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); }}
            className="btn-secondary"
          >
            Hapus Filter
          </button>
        </div>
      ) : goals.length === 0 ? (
        <div className="card p-12 text-center" role="status" aria-live="polite">
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary-400">Goals</div>
          <h3 className="text-xl font-semibold text-primary-900 mb-2">Belum ada target belajar</h3>
          <p className="text-primary-500 mb-6">Mulai dengan membuat target belajar pertamamu.</p>
          <button onClick={() => navigate('/coach?create=true')} className="btn-primary">
            Buat Goal Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}
