import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import { KpiCard } from '../components/ui/KpiCard';
import ProviderHealthSection from '../components/ProviderHealthSection';
import UsageOverTimeSection from '../components/UsageOverTimeSection';
import ActivityLogFilters from '../components/ActivityLogFilters';
import {
  ADMIN_ACTION_LABELS, ADMIN_ACTION_COLORS, ADMIN_STATUS_COLOR, ADMIN_PAGE_SIZES,
} from '../utils/constants';

function SortIcon({ dir }) {
  if (!dir) return <span className="text-primary-200 ml-1">&#8597;</span>;
  return <span className="text-primary-600 ml-1">{dir === 'asc' ? '\u2191' : '\u2195'}</span>;
}

function statusFromAction(action) {
  if (!action) return 'success';
  return action.includes('ERROR') || action.includes('REJECTED') ? 'error' : 'success';
}

function latencyDisplay(ms) {
  if (ms == null) return '\u2014';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function AdminPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  const tableRef = useRef(null);
  const searchRef = useRef(null);

  const loadData = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = { activity_limit: pageSize, activity_offset: page * pageSize };
      if (search) params.search = search;
      if (actionFilter) params.action = actionFilter;
      if (providerFilter) params.provider = providerFilter;
      if (modelFilter) params.model = modelFilter;
      if (statusFilter) params.status = statusFilter;
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
  }, [search, actionFilter, providerFilter, modelFilter, statusFilter, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        loadData();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
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
      let aVal = a[sortCol], bVal = b[sortCol];
      if (sortCol === 'timestamp') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (['total_tokens', 'input_tokens', 'output_tokens', 'latency_ms'].includes(sortCol)) {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [data, sortCol, sortDir]);

  const totalPages = data?.total ? Math.ceil(data.total / pageSize) : 0;

  const uniqueProviders = useMemo(() => {
    const set = new Set();
    (data?.recentActivity || []).forEach((r) => { if (r.provider) set.add(r.provider); });
    return [...set].sort();
  }, [data]);

  const uniqueModels = useMemo(() => {
    const set = new Set();
    (data?.recentActivity || []).forEach((r) => { if (r.model) set.add(r.model); });
    return [...set].sort();
  }, [data]);

  const hasActiveFilters = search || actionFilter || providerFilter || modelFilter || statusFilter || dateFrom || dateTo;

  const resetFilters = () => {
    setSearch(''); setActionFilter(''); setProviderFilter(''); setModelFilter(''); setStatusFilter('');
    setDateFrom(''); setDateTo(''); setPage(0);
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
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

  const { summary, trends, byDay } = data || {};
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

      {loading && data && <div className="text-xs text-primary-400 mb-4 italic">Memperbarui data...</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total AI Calls" value={summary?.totalCalls ?? 0} trend={trends?.totalCalls} />
        <KpiCard label="Total Tokens" value={summary?.totalTokens?.total ?? 0} sub={`${(summary?.totalTokens?.prompt ?? 0).toLocaleString()} prompt / ${(summary?.totalTokens?.completion ?? 0).toLocaleString()} completion`} trend={trends?.totalTokens} />
        <KpiCard label="Estimated Cost" value={summary?.estimatedCostUsd ?? 0} format="usd" trend={trends?.estimatedCostUsd} />
        <KpiCard label="Accept Rate" value={acceptRate} format="pct" trend={trends?.acceptRate} />
      </div>

      {byDay && byDay.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-primary-900 mb-4">Request Trend</h3>
          <div className="bg-white rounded-xl border border-primary-100 p-4 shadow-sm">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={[...byDay].reverse()}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Requests" />
                <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Errors" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <ProviderHealthSection byProvider={data?.byProvider} />

      <UsageOverTimeSection byDay={byDay} dateFrom={dateFrom} dateTo={dateTo} />

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
              {ADMIN_PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <ActivityLogFilters
          searchRef={searchRef} search={search} onSearchChange={(e) => { setSearch(e.target.value); setPage(0); }}
          actionFilter={actionFilter} onActionChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          providerFilter={providerFilter} onProviderChange={(e) => { setProviderFilter(e.target.value); setPage(0); }}
          modelFilter={modelFilter} onModelChange={(e) => { setModelFilter(e.target.value); setPage(0); }}
          statusFilter={statusFilter} onStatusChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          dateFrom={dateFrom} onDateFromChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          dateTo={dateTo} onDateToChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          uniqueProviders={uniqueProviders} uniqueModels={uniqueModels}
          hasActiveFilters={hasActiveFilters} onReset={resetFilters}
        />

        {sortedActivity.length > 0 ? (
          <>
            <div className="bg-white rounded-xl border border-primary-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table ref={tableRef} className="w-full text-sm" role="grid" aria-label="Tabel aktivitas terkini" onKeyDown={handleKeyDown}>
                  <thead>
                    <tr className="bg-primary-50 text-primary-500 text-xs uppercase tracking-wide">
                      {['timestamp', 'action', 'user_id', 'provider', 'model', 'input_tokens', 'output_tokens', 'total_tokens', 'latency_ms', 'status'].map((col) => (
                        <th
                          key={col}
                          onClick={() => handleSort(col)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(col); } }}
                          tabIndex={0}
                          role="columnheader"
                          aria-sort={sortCol === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                          className={`text-left px-3 py-3 font-semibold cursor-pointer hover:bg-primary-100/50 select-none whitespace-nowrap ${col === 'action' ? 'w-36' : ''} ${col === 'input_tokens' || col === 'output_tokens' || col === 'total_tokens' || col === 'latency_ms' ? 'text-right' : ''}`}
                        >
                          {col === 'user_id' ? 'User' : col === 'input_tokens' ? 'Input' : col === 'output_tokens' ? 'Output' : col === 'total_tokens' ? 'Total' : col === 'latency_ms' ? 'Latency' : col.charAt(0).toUpperCase() + col.slice(1)}
                          {sortCol === col && <SortIcon dir={sortDir} />}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-100">
                    {sortedActivity.map((a) => {
                      const actionMeta = ADMIN_ACTION_LABELS[a.action];
                      const actionColor = ADMIN_ACTION_COLORS[a.action] || 'bg-gray-100 text-gray-700';
                      const st = statusFromAction(a.action);
                      return (
                        <tr
                          key={a.id}
                          data-row="true"
                          data-selected={selectedRow === a.id}
                          onClick={() => setSelectedRow(a.id)}
                          onFocus={() => setSelectedRow(a.id)}
                          tabIndex={0}
                          className={`hover:bg-primary-50/50 transition-colors cursor-pointer outline-none ${selectedRow === a.id ? 'bg-primary-50 ring-2 ring-primary-200 ring-inset' : ''}`}
                        >
                          <td className="px-3 py-3 text-xs font-mono text-primary-400 whitespace-nowrap">{new Date(a.timestamp).toLocaleString('id-ID')}</td>
                          <td className="px-3 py-3"><span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${actionColor}`}>{actionMeta || a.action}</span></td>
                          <td className="px-3 py-3 text-xs text-primary-500 font-mono max-w-[100px] truncate" title={a.user_id}>{a.user_id || '\u2014'}</td>
                          <td className="px-3 py-3 text-xs text-primary-500">{a.provider || '\u2014'}</td>
                          <td className="px-3 py-3 text-xs text-primary-500 font-mono max-w-[120px] truncate" title={a.model}>{a.model || '\u2014'}</td>
                          <td className="px-3 py-3 text-xs text-right text-primary-700 tabular-nums">{a.input_tokens?.toLocaleString() || '\u2014'}</td>
                          <td className="px-3 py-3 text-xs text-right text-primary-700 tabular-nums">{a.output_tokens?.toLocaleString() || '\u2014'}</td>
                          <td className="px-3 py-3 text-xs text-right text-primary-700 tabular-nums font-semibold">{a.total_tokens?.toLocaleString() || '\u2014'}</td>
                          <td className="px-3 py-3 text-xs text-right text-primary-500 tabular-nums">{latencyDisplay(a.latency_ms)}</td>
                          <td className="px-3 py-3"><span className={`text-xs font-medium px-2 py-1 rounded ${ADMIN_STATUS_COLOR[st] || 'bg-gray-100 text-gray-700'}`}>{st}</span></td>
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
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-primary-200 text-primary-600 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Halaman sebelumnya">&#8592; Prev</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const start = Math.max(0, Math.min(page - 3, totalPages - 7));
                  const idx = start + i;
                  if (idx >= totalPages) return null;
                  return (
                    <button key={idx} onClick={() => setPage(idx)} className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${page === idx ? 'bg-primary-900 text-white' : 'text-primary-600 hover:bg-primary-50 border border-primary-200'}`} aria-label={`Halaman ${idx + 1}`} aria-current={page === idx ? 'page' : undefined}>
                      {idx + 1}
                    </button>
                  );
                })}
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-primary-200 text-primary-600 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" aria-label="Halaman berikutnya">Next &#8594;</button>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-primary-100 p-8 text-center">
            <svg className="w-10 h-10 mx-auto text-primary-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm text-primary-400">Belum ada aktivitas tercatat.</p>
            {hasActiveFilters && <p className="text-xs text-primary-300 mt-1">Coba ubah filter atau kata kunci pencarian.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
