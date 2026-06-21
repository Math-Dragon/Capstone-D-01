import { ADMIN_ACTION_LABELS } from '../utils/constants';

export default function ActivityLogFilters({
  searchRef, search, onSearchChange,
  actionFilter, onActionChange,
  providerFilter, onProviderChange,
  modelFilter, onModelChange,
  statusFilter, onStatusChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
  uniqueProviders, uniqueModels,
  hasActiveFilters, onReset,
}) {
  const resetPage = (fn) => (e) => { fn(e.target ? e.target.value : e); };

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <div className="relative flex-1 min-w-[200px]">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={onSearchChange}
          placeholder="Cari user ID atau aksi..."
          className="w-full text-sm pl-9 pr-3 py-2 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
          aria-label="Cari aktivitas"
        />
      </div>
      <select
        value={actionFilter}
        onChange={onActionChange}
        className="text-sm px-3 py-2 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
        aria-label="Filter berdasarkan aksi"
      >
        <option value="">Semua Aksi</option>
        {Object.entries(ADMIN_ACTION_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>
      <select
        value={providerFilter}
        onChange={onProviderChange}
        className="text-sm px-3 py-2 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
        aria-label="Filter berdasarkan provider"
      >
        <option value="">Semua Provider</option>
        {uniqueProviders.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <select
        value={modelFilter}
        onChange={onModelChange}
        className="text-sm px-3 py-2 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
        aria-label="Filter berdasarkan model"
      >
        <option value="">Semua Model</option>
        {uniqueModels.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <select
        value={statusFilter}
        onChange={onStatusChange}
        className="text-sm px-3 py-2 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
        aria-label="Filter berdasarkan status"
      >
        <option value="">Semua Status</option>
        <option value="success">Success</option>
        <option value="error">Error</option>
      </select>
      <input
        type="date"
        value={dateFrom}
        onChange={onDateFromChange}
        className="text-sm px-3 py-2 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
        aria-label="Dari tanggal"
      />
      <input
        type="date"
        value={dateTo}
        onChange={onDateToChange}
        className="text-sm px-3 py-2 border border-primary-200 rounded-lg bg-white focus:outline-none focus:border-primary-400"
        aria-label="Sampai tanggal"
      />
      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="text-xs text-primary-500 hover:text-primary-700 px-2"
          aria-label="Hapus semua filter"
        >
          Reset
        </button>
      )}
    </div>
  );
}
