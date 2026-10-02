import { useEffect, useRef, useState } from 'react';
import useFocusTrap from '../../../hooks/useFocusTrap';
import {
  MOOD_OPTIONS,
  EVENT_TYPE_LABELS,
  SOURCE_LABELS,
  formatDateTime,
  ACTION_BUTTON_CLASS,
  SUBTLE_ACTION_CLASS,
  DANGER_ACTION_CLASS,
  PRIMARY_ACTION_CLASS,
} from './progressMeta';

const NOTE_MAX = 500;

function MetaRow({ label, children }) {
  return (
    <div className="py-2">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-primary-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-primary-800">{children}</dd>
    </div>
  );
}

/**
 * Detail satu kejadian riwayat + form koreksi (mood, note, version)
 * + konfirmasi hapus. `item` dipakai untuk izin aksi (`actions.*`),
 * `detail` untuk isi dan `version` terbaru.
 */
export default function HistoryDetailModal({
  item,
  initialMode = 'view',
  detail,
  loading,
  error,
  notice,
  busy,
  timezone,
  onClose,
  onCorrect,
  onDelete,
}) {
  const containerRef = useRef(null);
  const initializedIdRef = useRef(null);
  const open = Boolean(item);
  const [mode, setMode] = useState('view');
  const [mood, setMood] = useState('');
  const [note, setNote] = useState('');

  useFocusTrap(containerRef, open);

  useEffect(() => {
    if (!open) {
      setMode('view');
      setMood('');
      setNote('');
    }
  }, [open]);

  // Isi form hanya di-reset saat catatan BARU dibuka. Muat ulang detail
  // (mis. setelah 409) memperbarui `version` tanpa menghapus ketikan pengguna.
  useEffect(() => {
    if (!detail) {
      initializedIdRef.current = null;
      return;
    }
    if (initializedIdRef.current === detail.id) return;
    initializedIdRef.current = detail.id;
    setMood(detail.mood?.value || '');
    setNote(detail.note || '');
    setMode(initialMode);
  }, [detail, initialMode]);

  useEffect(() => {
    if (!open) return undefined;
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const actions = item.actions || {};
  const eventTypeLabel = EVENT_TYPE_LABELS[item.event_type] || item.event_type;
  const busyCorrect = busy === 'correct';
  const busyDelete = busy === 'delete';
  const noteLength = note.length;

  const submitCorrection = (event) => {
    event.preventDefault();
    if (busyCorrect || detail == null) return;
    onCorrect({
      mood: mood === '' ? null : mood,
      note,
      version: detail.version,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-detail-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl sm:p-6"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-400">
              Detail catatan
            </p>
            <h3 id="history-detail-title" className="text-lg font-bold text-primary-900">
              {eventTypeLabel}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail catatan"
            className={`${SUBTLE_ACTION_CLASS} shrink-0 px-3`}
          >
            ✕
          </button>
        </div>

        {notice && (
          <p
            role={notice.tone === 'alert' ? 'alert' : 'status'}
            className={`mb-3 rounded-xl border p-3 text-sm ${
              notice.tone === 'alert'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-primary-100 bg-primary-50 text-primary-700'
            }`}
          >
            {notice.text}
          </p>
        )}

        {loading && (
          <p role="status" className="py-6 text-center text-sm text-primary-500">
            Memuat detail catatan…
          </p>
        )}

        {!loading && error && (
          <div role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && detail && (
          <>
            <dl className="divide-y divide-primary-100 border-y border-primary-100">
              <MetaRow label="Waktu">
                {formatDateTime(detail.occurred_at, timezone)}
                <span className="ml-2 text-xs text-primary-400">
                  ({SOURCE_LABELS[detail.source] || detail.source || '–'})
                </span>
              </MetaRow>
              <MetaRow label="Suasana hati">
                {detail.mood?.label || <span className="text-primary-400">Tidak diisi</span>}
              </MetaRow>
              <MetaRow label="Catatan">
                {detail.note ? (
                  <span className="whitespace-pre-wrap break-words">{detail.note}</span>
                ) : (
                  <span className="text-primary-400">Tidak ada catatan</span>
                )}
              </MetaRow>
              {detail.linked_task?.title && (
                <MetaRow label="Tugas terkait">{detail.linked_task.title}</MetaRow>
              )}
              {detail.linked_goal?.title && (
                <MetaRow label="Target terkait">{detail.linked_goal.title}</MetaRow>
              )}
              <MetaRow label="Riwayat perubahan">
                {detail.correction?.is_corrected
                  ? `Diperbaiki ${detail.correction.count}× · terakhir ${formatDateTime(detail.correction.corrected_at, timezone)}`
                  : 'Belum pernah diperbaiki'}
              </MetaRow>
            </dl>

            {mode === 'correct' && (
              <form onSubmit={submitCorrection} className="mt-4 rounded-xl border border-primary-100 bg-primary-50/60 p-4">
                <h4 className="mb-3 text-sm font-semibold text-primary-900">Perbaiki catatan</h4>

                <label htmlFor="correct-mood" className="mb-1.5 block text-sm font-medium text-primary-700">
                  Suasana hati
                </label>
                <select
                  id="correct-mood"
                  value={mood}
                  onChange={(event) => setMood(event.target.value)}
                  disabled={busyCorrect}
                  className="input mb-3"
                >
                  <option value="">Tidak diisi</option>
                  {MOOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <label htmlFor="correct-note" className="mb-1.5 block text-sm font-medium text-primary-700">
                  Catatan
                </label>
                <textarea
                  id="correct-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, NOTE_MAX))}
                  maxLength={NOTE_MAX}
                  rows={3}
                  disabled={busyCorrect}
                  placeholder="Tulis perbaikan catatanmu…"
                  className="input min-h-[80px] resize-y"
                />
                <p className="mt-1 text-xs text-primary-400">{noteLength}/{NOTE_MAX} karakter</p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={busyCorrect}
                    className={`${PRIMARY_ACTION_CLASS} disabled:opacity-50`}
                  >
                    {busyCorrect ? 'Menyimpan…' : 'Simpan perubahan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('view')}
                    disabled={busyCorrect}
                    className={SUBTLE_ACTION_CLASS}
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}

            {mode === 'delete' && (
              <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-800">Hapus catatan ini?</p>
                <p className="mt-1 text-sm text-red-700">
                  Catatan yang dihapus tidak bisa dikembalikan. Perkembangan tugasmu tidak ikut terhapus.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={busyDelete}
                    className={DANGER_ACTION_CLASS}
                  >
                    {busyDelete ? 'Menghapus…' : 'Ya, hapus'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('view')}
                    disabled={busyDelete}
                    className={SUBTLE_ACTION_CLASS}
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}

            {mode === 'view' && (
              <div className="mt-4 flex flex-wrap gap-3">
                {actions.can_correct && (
                  <button
                    type="button"
                    onClick={() => setMode('correct')}
                    className={SUBTLE_ACTION_CLASS}
                  >
                    Perbaiki
                  </button>
                )}
                {actions.can_delete && (
                  <button
                    type="button"
                    onClick={() => setMode('delete')}
                    className={DANGER_ACTION_CLASS}
                  >
                    Hapus
                  </button>
                )}
                <button type="button" onClick={onClose} className={ACTION_BUTTON_CLASS}>
                  Tutup
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
