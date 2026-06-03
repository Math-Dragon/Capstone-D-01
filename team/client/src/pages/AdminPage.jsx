import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '../services/api';

const PAGE_SIZES = [10, 25, 50];

const ACTION_LABELS = {
  COACH_TASK_ACCEPTED: 'Accepted',
  COACH_TASK_REJECTED: 'Rejected',
  COACH_TASK_COMPLETED: 'Completed',
  COACH_TASK_SKIPPED: 'Skipped',
  COACH_TASK_COMPLETED_RESPONSE: 'Responded',
  COACH_FEEDBACK_SUBMITTED: 'Feedback',
  COACH_CHAT_MESSAGE: 'Chat',
  COACH_CHAT_RESPONDED: 'Responded',
  COACH_PLAN_GENERATED: 'Plan',
  COACH_LLM_CALL: 'LLM Call',
  COACH_LLM_ERROR: 'LLM Error',
  COACH_STATIC_FEEDBACK: 'Static Feedback',
  COACH_STATIC_SKIP: 'Static Skip',
  COACH_STATIC_CHECKIN: 'Static Check-in',
  COACH_PROPOSAL_ACCEPTED: 'Proposal Accepted',
  COACH_PLAN_UNDONE: 'Plan Undone',
};

const ACTION_COLORS = {
  COACH_TASK_ACCEPTED: 'bg-green-100 text-green-700',
  COACH_TASK_REJECTED: 'bg-red-100 text-red-700',
  COACH_TASK_COMPLETED: 'bg-emerald-100 text-emerald-700',
  COACH_TASK_SKIPPED: 'bg-amber-100 text-amber-700',
  COACH_CHAT_MESSAGE: 'bg-sky-100 text-sky-700',
  COACH_PLAN_GENERATED: 'bg-violet-100 text-violet-700',
  COACH_LLM_CALL: 'bg-rose-100 text-rose-700',
  COACH_LLM_ERROR: 'bg-red-200 text-red-800',
};

function KpiCard({ label, value, sub, format }) {
  const display = format === 'usd' ? `$${Number(value).toFixed(4)}` : format === 'pct' ? `${value}%` : value?.toLocaleString?.() ?? value;
  return (
    <div className="bg-white rounded-xl border border-primary-100 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary-400 mb-1">{label}</p>
      <p className="text-3xl font-bold text-primary-900 tabular-nums">{display}</p>
      {sub && <p className="text-xs text-primary-400 mt-1">{sub}</p>}
    </div>
  );
}

function SortIcon({ dir }) {
  if (!dir) return <span className="text-primary-200 ml-1">&#8597;</span>;
  return <span className="text-primary-600 ml-1">{dir === 'asc' ? '&#8593;' : '&#8595;'}</span>;
}

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [providerSearch, setProviderSearch] = useState('');
  const [providerSort, setProviderSort] = useState(null);
  const [providerDir, setProviderDir] = useState(null);

  const tableRef = useRef(null);
  const searchRef = useRef(null);

  const loadData = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = {
        activity_limit: pageSize,
        activity_offset: page * pageSize,
      };
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.get('/admin/metrics', { signal, params });
      setData(res);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Gagal memuat data admin.');
      }
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        loadData();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loadData]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const sortedActivity = useMemo(() => {
    const items = data?.recentActivity || [];
    if (!sortCol || !sortDir) return items;
    return [...items].sort((a, b) => {
      let aVal = a[sortCol];
      let bVal = b[sortCol];
      if (sortCol === 'timestamp') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [data, sortCol, sortDir]);

  const sortedProvider = useMemo(() => {
    const items = data?.byProvider || [];
    if (!providerSort || !providerDir) return items;
    return [...items].sort((a, b) => {
      let aVal = a[providerSort];
      let bVal = b[providerSort];
      if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = (bVal || '').toLowerCase(); }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return providerDir === 'desc' ? -cmp : cmp;
    });
  }, [data, providerSort, providerDir]);

  const filteredProvider = useMemo(() => {
    if (!providerSearch) return sortedProvider;
    const q = providerSearch.toLowerCase();
    return sortedProvider.filter((p) => p.provider.toLowerCase().includes(q) || p.model.toLowerCase().includes(q));
  }, [sortedProvider, providerSearch]);

  const totalPages = data?.total ? Math.ceil(data.total / pageSize) : 0;

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const rows = tableRef.current?.querySelectorAll('[data-row]');
      if (!rows || rows.length === 0) return;
      e.preventDefault();
      let idx = -1;
      rows.forEach((r, i) => { if (r.dataset.selected === 'true') idx = i; });
      const next = e.key === 'ArrowDown' ? Math.min(idx + 1, rows.length - 1) : Math.max(idx - 1, 0);
      rows.forEach((r) => r.dataset.selected = 'false');
      rows[next].dataset.selected = 'true';
      rows[next].focus();
      setSelectedRow(data?.recentActivity?.[next]?.id || null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-32" role="status" aria-live="polite" aria-busy="true">
        <p className="text-primary-400 font-medium">Memuat data admin...</p>
      </div>
    );
  }

  if (error) {
    const isForbidden = error.includes('FORBIDDEN') || error.includes('Akses ditolak') || error.includes('belum dikonfigurasi');
    const isUnauthed = error.includes('UNAUTHORIZED') || error.includes('login');
    return (
      <div className="flex flex-col items-center justify-center py-20" role="alert" aria-live="assertive">
        {isForbidden ? (
          <>
            <p className="text-red-600 font-semibold mb-2">Akses Admin Ditolak</p>
            <p className="text-sm text-primary-500 mb-4 max-w-md text-center">
              Halaman admin hanya dapat diakses oleh pengguna dengan email yang terdaftar.
            </p>
          </>
        ) : isUnauthed ? (
          <>
            <p className="text-red-600 font-semibold mb-2">Sesi Berakhir</p>
            <p className="text-sm text-primary-500 mb-4 max-w-md text-center">
              Silakan login terlebih dahulu untuk mengakses halaman admin.
            </p>
          </>
        ) : (
          <>
            <p className="text-red-600 font-semibold mb-2">Gagal Memuat Data</p>
            <p className="text-sm text-primary-500 mb-4 max-w-md text-center">{error}</p>
          </>
        )}
        <button onClick={() => loadData()} className="btn-primary">Coba Lagi</button>
      </div>
    );
  }

  const { summary, byDay } = data || {};
  const acceptRate = summary ? Math.round(summary.acceptRate * 100) : 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-primary-900 mb-1">AI Usage Monitoring</h2>
          <p className="text-primary-400">Dashboard monitoring penggunaan AI, biaya, dan performa provider.</p>
        </div>
        <button
          onClick={() => loadData()}
          disabled={loading}
          className="btn-secondary !px-4 !py-2 !rounded-xl !text-sm shrink-0 flex items-center gap-2 disabled:opacity-50"
          aria-label="Muat ulang data"
          title="Muat ulang (Ctrl+Shift+R)"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Memuat...' : 'Refresh'}
        </button>
      </div>

      {loading && data && (
        <div className="text-xs text-primary-400 mb-4 italic">Memperbarui data...</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total AI Calls" value={summary?.totalCalls ?? 0} />
        <KpiCard label="Total Tokens" value={summary?.totalTokens?.total ?? 0} sub={`${(summary?.totalTokens?.prompt ?? 0).toLocaleString()} prompt / ${(summary?.totalTokens?.completion ?? 0).toLocaleString()} completion`} />
        <KpiCard label="Estimated Cost" value={summary?.estimatedCostUsd ?? 0} format="usd" />
        <KpiCard label="Accept Rate" value={acceptRate} format="pct" />
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-primary-900">Provider Health</h3>
            <p className="text-sm text-primary-400 mt-0.5">Penggunaan per provider LLM.</p>
          </div>
          <input
            type="text"
            value={providerSearch}
            onChange={(e) => setProviderSearch(e.target.value)}
            placeholder="Cari provider/model..."
            className="text-sm px-3 py-1.5 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400 w-56"
            aria-label="Cari provider atau model"
          />
        </div>
        {filteredProvider.length > 0 ? (
          <div className="bg-white rounded-xl border border-primary-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm" role="grid" aria-label="Tabel provider">
              <thead>
                <tr className="bg-primary-50 text-primary-500 text-xs uppercase tracking-wide">
                  {['provider', 'model', 'calls', 'tokens', 'estimatedCostUsd'].map((col) => (
                    <th
                      key={col}
                      onClick={() => { setProviderSort(col); setProviderDir((d) => d === 'asc' ? 'desc' : 'asc'); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setProviderSort(col); setProviderDir((d) => d === 'asc' ? 'desc' : 'asc'); } }}
                      tabIndex={0}
                      role="columnheader"
                      aria-sort={providerSort === col ? (providerDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      className={`text-left px-4 py-3 font-semibold cursor-pointer hover:bg-primary-100/50 select-none ${col === 'calls' || col === 'tokens' || col === 'estimatedCostUsd' ? 'text-right' : 'text-left'}`}
                    >
                      {col === 'estimatedCostUsd' ? 'Est. Cost' : col.charAt(0).toUpperCase() + col.slice(1)}
                      {providerSort === col && <SortIcon dir={providerDir} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {filteredProvider.map((p, i) => (
                  <tr key={i} className="hover:bg-primary-50/50 transition-colors" tabIndex={0}>
                    <td className="px-4 py-3 font-medium text-primary-900">{p.provider}</td>
                    <td className="px-4 py-3 text-primary-500 font-mono text-xs">{p.model}</td>
                    <td className="px-4 py-3 text-right text-primary-700 tabular-nums">{p.calls}</td>
                    <td className="px-4 py-3 text-right text-primary-700 tabular-nums">{p.tokens?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-primary-700 tabular-nums">${p.estimatedCostUsd?.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-primary-400 italic">Belum ada data provider.</p>
        )}
      </div>

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-primary-900">Usage Over Time</h3>
            <p className="text-sm text-primary-400 mt-0.5">Aktivitas harian berdasarkan periode.</p>
          </div>
          {(dateFrom || dateTo) && (
            <span className="text-xs text-primary-400">
              {dateFrom && `Dari ${dateFrom}`}{dateFrom && dateTo && ' '}{dateTo && `s.d. ${dateTo}`}
            </span>
          )}
        </div>
        {byDay && byDay.length > 0 ? (
          <div className="bg-white rounded-xl border border-primary-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm" role="grid" aria-label="Tabel penggunaan harian">
              <thead>
                <tr className="bg-primary-50 text-primary-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-semibold">Date</th>
                  <th className="text-right px-4 py-3 font-semibold">Requests</th>
                  <th className="text-right px-4 py-3 font-semibold">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {byDay.map((d, i) => (
                  <tr key={i} className="hover:bg-primary-50/50 transition-colors" tabIndex={0}>
                    <td className="px-4 py-3 font-medium text-primary-900">{d.date}</td>
                    <td className="px-4 py-3 text-right text-primary-700 tabular-nums">{d.requests?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`tabular-nums ${d.errors > 0 ? 'text-red-600 font-semibold' : 'text-primary-400'}`}>
                        {d.errors}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-primary-400 italic">Belum ada data harian.</p>
        )}
      </div>

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-primary-900">Aktivitas Terkini</h3>
            <p className="text-sm text-primary-400 mt-0.5">
              Log audit pengguna. Gunakan filter dan pencarian untuk menelusuri aktivitas.
              {data?.total !== undefined && <span className="ml-1 font-medium">{data.total} record ditemukan.</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary-400">Baris per halaman:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="text-xs px-2 py-1.5 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
              aria-label="Jumlah baris per halaman"
            >
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Cari user ID atau aksi..."
              className="w-full text-sm pl-9 pr-3 py-2 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
              aria-label="Cari aktivitas"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            className="text-sm px-3 py-2 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
            aria-label="Filter berdasarkan aksi"
          >
            <option value="">Semua Aksi</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="text-sm px-3 py-2 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
            aria-label="Dari tanggal"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="text-sm px-3 py-2 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
            aria-label="Sampai tanggal"
          />
          {(search || actionFilter || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearch(''); setActionFilter(''); setDateFrom(''); setDateTo(''); setPage(0); }}
              className="text-xs text-primary-500 hover:text-primary-700 px-2"
              aria-label="Hapus semua filter"
            >
              Reset
            </button>
          )}
        </div>

        {sortedActivity.length > 0 ? (
          <>
            <div className="bg-white rounded-xl border border-primary-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table
                  ref={tableRef}
                  className="w-full text-sm"
                  role="grid"
                  aria-label="Tabel aktivitas terkini"
                  onKeyDown={handleKeyDown}
                >
                  <thead>
                    <tr className="bg-primary-50 text-primary-500 text-xs uppercase tracking-wide">
                      {['timestamp', 'action', 'user_id'].map((col) => (
                        <th
                          key={col}
                          onClick={() => handleSort(col)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(col); } }}
                          tabIndex={0}
                          role="columnheader"
                          aria-sort={sortCol === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                          className={`text-left px-4 py-3 font-semibold cursor-pointer hover:bg-primary-100/50 select-none ${col === 'action' ? 'w-48' : ''}`}
                        >
                          {col === 'user_id' ? 'User ID' : col.charAt(0).toUpperCase() + col.slice(1)}
                          {sortCol === col && <SortIcon dir={sortDir} />}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-100">
                    {sortedActivity.map((a) => {
                      const actionMeta = ACTION_LABELS[a.action];
                      const actionColor = ACTION_COLORS[a.action] || 'bg-gray-100 text-gray-700';
                      return (
                        <tr
                          key={a.id}
                          data-row="true"
                          data-selected={selectedRow === a.id}
                          onClick={() => setSelectedRow(a.id)}
                          onFocus={() => setSelectedRow(a.id)}
                          tabIndex={0}
                          className={`hover:bg-primary-50/50 transition-colors cursor-pointer outline-none ${
                            selectedRow === a.id ? 'bg-primary-50 ring-2 ring-primary-200 ring-inset' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-xs font-mono text-primary-400 whitespace-nowrap">
                            {new Date(a.timestamp).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${actionColor}`}>
                              {actionMeta || a.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-primary-500 font-mono">
                            {a.user_id || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3" role="navigation" aria-label="Navigasi halaman">
              <span className="text-xs text-primary-400">
                Halaman {page + 1} dari {totalPages || 1}
                {data?.total !== undefined && ` (${data.total} total)`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-primary-200 text-primary-600 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Halaman sebelumnya"
                >
                  &#8592; Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const start = Math.max(0, Math.min(page - 3, totalPages - 7));
                  const idx = start + i;
                  if (idx >= totalPages) return null;
                  return (
                    <button
                      key={idx}
                      onClick={() => setPage(idx)}
                      className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                        page === idx
                          ? 'bg-primary-900 text-white'
                          : 'text-primary-600 hover:bg-primary-50 border border-primary-200'
                      }`}
                      aria-label={`Halaman ${idx + 1}`}
                      aria-current={page === idx ? 'page' : undefined}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-primary-200 text-primary-600 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Halaman berikutnya"
                >
                  Next &#8594;
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-primary-100 p-8 text-center">
            <svg className="w-10 h-10 mx-auto text-primary-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm text-primary-400">Belum ada aktivitas tercatat.</p>
            {(search || actionFilter || dateFrom || dateTo) && (
              <p className="text-xs text-primary-300 mt-1">Coba ubah filter atau kata kunci pencarian.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
