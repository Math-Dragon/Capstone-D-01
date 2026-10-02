import { useCallback, useState } from 'react';
import { useProgressHistory } from '../hooks/useProgress';
import { getHistoryDetail, correctHistory, deleteHistory } from '../services/progressService';
import HistoryDetailModal from './HistoryDetailModal';
import EmptyState from '../../../components/ui/EmptyState';
import ErrorState from '../../../components/ui/ErrorState';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  HISTORY_FILTERS,
  EVENT_TYPE_LABELS,
  SOURCE_LABELS,
  formatDateTime,
  SUBTLE_ACTION_CLASS,
  DANGER_ACTION_CLASS,
} from './progressMeta';

const CONFLICT_MESSAGE = 'Catatan ini sudah berubah. Memuat ulang.';

function isConflict(error) {
  return error?.statusCode === 409 || error?.code === 'CONFLICT';
}

function HistorySkeleton() {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Memuat catatan…</span>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="card p-4">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterBar({ value, onChange }) {
  return (
    <div
      role="group"
      aria-label="Saring catatan"
      className="mb-4 flex flex-wrap gap-2"
    >
      {HISTORY_FILTERS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-medium transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
              ${active
                ? 'border-primary-900 bg-primary-900 text-white'
                : 'border-primary-200 bg-white text-primary-700 hover:border-primary-300 hover:bg-primary-50'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function HistoryRow({ entry, timezone, disabled, onView, onCorrect, onDelete }) {
  const actions = entry.actions || {};
  const label = EVENT_TYPE_LABELS[entry.event_type] || entry.event_type;

  return (
    <li className="card p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-primary-100 px-2 py-1 text-xs font-semibold text-primary-700">
            {label}
          </span>
          {entry.mood && (
            <span className="rounded-lg border border-primary-100 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
              {entry.mood.label}
            </span>
          )}
          {entry.is_corrected && (
            <span className="rounded-lg border border-warm-200 bg-warm-100 px-2 py-1 text-xs font-semibold text-warm-700">
              diperbaiki
            </span>
          )}
        </div>

        <p className="mt-2 break-words text-sm leading-relaxed text-primary-800">{entry.summary}</p>

        <p className="mt-1 text-xs text-primary-400">
          {formatDateTime(entry.occurred_at, timezone)}
          {entry.source && ` · ${SOURCE_LABELS[entry.source] || entry.source}`}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-primary-100 pt-3">
        {actions.can_view && (
          <button type="button" onClick={() => onView(entry)} disabled={disabled} className={SUBTLE_ACTION_CLASS}>
            Lihat detail
          </button>
        )}
        {actions.can_correct && (
          <button type="button" onClick={() => onCorrect(entry)} disabled={disabled} className={SUBTLE_ACTION_CLASS}>
            Perbaiki          </button>
        )}
        {actions.can_delete && (
          <button type="button" onClick={() => onDelete(entry)} disabled={disabled} className={DANGER_ACTION_CLASS}>
            Hapus
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * Tab Riwayat: daftar check-in/check-out berpaginasi, filter, dan aksi
 * lihat / koreksi / hapus. Semua hasil aksi diumumkan lewat role="status"
 * atau role="alert", dan setiap mutasi me-reload riwayat + overview.
 */
export default function HistoryTab({ timezone, onOverviewChange }) {
  const [filter, setFilter] = useState('all');
  const [item, setItem] = useState(null);
  const [openMode, setOpenMode] = useState('view');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const { items, page, loading, error, loadingMore, reload, loadMore } = useProgressHistory({
    filter,
    limit: 20,
  });

  const syncAfterMutation = useCallback(() => {
    reload();
    onOverviewChange?.();
  }, [reload, onOverviewChange]);

  const fetchDetail = useCallback(async (id) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const data = await getHistoryDetail(id);
      setDetail(data);
    } catch (err) {
      setDetailError(err?.message || 'Gagal memuat detail catatan.');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openDetail = useCallback((entry, mode = 'view') => {
    setItem(entry);
    setOpenMode(mode);
    setDetail(null);
    setDetailError(null);
    setNotice(null);
    fetchDetail(entry.id);
  }, [fetchDetail]);

  const closeDetail = useCallback(() => {
    setItem(null);
    setDetail(null);
    setDetailError(null);
    setOpenMode('view');
  }, []);

  const handleCorrect = useCallback(async ({ mood, note, version }) => {
    if (!item || busy) return;
    setBusy('correct');
    setNotice(null);
    try {
      await correctHistory(item.id, { mood, note, version });
      setNotice({ tone: 'status', text: 'Perubahanmu tersimpan.' });
      closeDetail();
      syncAfterMutation();
    } catch (err) {
      if (isConflict(err)) {
        setNotice({ tone: 'alert', text: CONFLICT_MESSAGE });
        reload();
        fetchDetail(item.id);
      } else {
        setNotice({ tone: 'alert', text: err?.message || 'Gagal menyimpan perubahan.' });
      }
    } finally {
      setBusy(null);
    }
  }, [item, busy, closeDetail, syncAfterMutation, reload, fetchDetail]);

  const handleDelete = useCallback(async () => {
    if (!item || busy) return;
    setBusy('delete');
    setNotice(null);
    try {
      await deleteHistory(item.id);
      setNotice({ tone: 'status', text: 'Catatan dihapus.' });
      closeDetail();
      syncAfterMutation();
    } catch (err) {
      if (err?.statusCode === 404) {
        setNotice({ tone: 'alert', text: 'Catatan tidak ditemukan. Daftar dimuat ulang.' });
        closeDetail();
        reload();
      } else {
        setNotice({ tone: 'alert', text: err?.message || 'Gagal menghapus catatan.' });
      }
    } finally {
      setBusy(null);
    }
  }, [item, busy, closeDetail, syncAfterMutation, reload]);

  const panelNotice = item ? null : notice;

  return (
    <div>
      <p className="mb-4 text-sm text-primary-500">
        Catatan suasana hati dan refleksimu. Perkembangan tugas ada di tab Tren.
      </p>

      <FilterBar value={filter} onChange={(next) => { setFilter(next); setNotice(null); }} />

      {panelNotice && (
        <p
          role={panelNotice.tone === 'alert' ? 'alert' : 'status'}
          className={`mb-4 rounded-xl border p-3 text-sm ${
            panelNotice.tone === 'alert'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-primary-100 bg-primary-50 text-primary-700'
          }`}
        >
          {panelNotice.text}
        </p>
      )}

      {loading && <HistorySkeleton />}

      {!loading && error && (
        <ErrorState
          message="Gagal memuat catatan."
          helpText="Periksa koneksi, lalu coba muat ulang daftar catatan."
          onRetry={reload}
        />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon="🗒️"
          title={filter !== 'all' ? 'Tidak ada catatan pada pilihan ini' : 'Belum ada catatan suasana hati'}
          description="Catatan kosong bukan berarti kamu tidak maju. Perkembangan tugasmu tetap ada di tab Tren."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <ul className="space-y-3">
            {items.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                timezone={timezone}
                disabled={Boolean(busy)}
                onView={(target) => openDetail(target, 'view')}
                onCorrect={(target) => openDetail(target, 'correct')}
                onDelete={(target) => openDetail(target, 'delete')}
              />
            ))}
          </ul>

          {page?.has_more && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className={`${SUBTLE_ACTION_CLASS} px-6 ${loadingMore ? 'opacity-50' : ''}`}
              >
                {loadingMore ? 'Memuat…' : 'Muat lagi'}
              </button>
            </div>
          )}
        </>
      )}

      <HistoryDetailModal
        item={item}
        initialMode={openMode}
        detail={detail}
        loading={detailLoading}
        error={detailError}
        notice={notice}
        busy={busy}
        timezone={timezone}
        onClose={closeDetail}
        onCorrect={handleCorrect}
        onDelete={handleDelete}
      />
    </div>
  );
}
