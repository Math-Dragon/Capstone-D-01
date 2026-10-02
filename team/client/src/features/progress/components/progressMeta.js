// Konstanta dan pemformatan untuk halaman Progress.
// Label mood/event mengikuti enum server (check-in-event.model.js) supaya UI
// tidak mengirim nilai yang ditolak validasi.

export const TASK_TYPE_META = {
  acquire: { label: 'Belajar materi', color: '#818CF8', icon: '📖' },
  practice: { label: 'Latihan', color: '#F0A500', icon: '✏️' },
  recall: { label: 'Mengingat kembali', color: '#EC4899', icon: '🧠' },
  interleave: { label: 'Latihan campuran', color: '#06B6D4', icon: '🔀' },
  synthesize: { label: 'Merangkum', color: '#A78BFA', icon: '🔗' },
  review: { label: 'Mengulas', color: '#34D399', icon: '🔄' },
  assess: { label: 'Evaluasi', color: '#F87171', icon: '📋' },
  reflect: { label: 'Refleksi', color: '#94A3B8', icon: '💬' },
  other: { label: 'Lainnya', color: '#94A3B8', icon: '📌' },
};

export const PROGRESS_TABS = [
  { key: 'tren', label: 'Tren', tabId: 'progress-tab-tren', panelId: 'progress-panel-tren' },
  { key: 'riwayat', label: 'Riwayat', tabId: 'progress-tab-riwayat', panelId: 'progress-panel-riwayat' },
];

export const PERIOD_OPTIONS = [
  { value: '7d', label: '7d', accessible: '7 hari terakhir' },
  { value: '30d', label: '30d', accessible: '30 hari terakhir' },
  { value: 'all', label: 'all', accessible: 'Seluruh waktu' },
];

export const PERIOD_LABELS = {
  '7d': '7 hari terakhir',
  '30d': '30 hari terakhir',
  all: 'Seluruh waktu',
};

export const BUCKET_LABELS = {
  day: 'harian',
  week: 'mingguan',
  month: 'bulanan',
};

export const HISTORY_FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'check_in', label: 'Isi suasana hati' },
  { value: 'check_out', label: 'Refleksi' },
  { value: 'skipped', label: 'Dilewati' },
  { value: 'corrected', label: 'Diperbaiki' },
];

// Enum moods server: great | good | okay | struggling | overwhelmed | drained
export const MOOD_OPTIONS = [
  { value: 'great', label: 'Sangat baik' },
  { value: 'good', label: 'Baik' },
  { value: 'okay', label: 'Biasa saja' },
  { value: 'struggling', label: 'Berat' },
  { value: 'overwhelmed', label: 'Kewalahan' },
  { value: 'drained', label: 'Kehabisan energi' },
];

export const EVENT_TYPE_LABELS = {
  submitted: 'Isi suasana hati',
  skipped: 'Suasana hati dilewati',
  checkout_submitted: 'Refleksi setelah belajar',
};

export const SOURCE_LABELS = {
  daily_gateway: 'Dari aplikasi',
  manual: 'Diisi sendiri',
  checkout: 'Refleksi',
  system: 'Sistem',
};

const DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const DATE_TIME_FALLBACK = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** `YYYY-MM-DD` (tanggal sipil dari server) → "22 Sep 2026". */
export function formatDateKey(key) {
  if (!key) return '–';
  const iso = String(key).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(key);
  return DATE_FORMAT.format(new Date(`${iso}T00:00:00Z`));
}

/** ISO timestamp → "22 Sep 2026, 07.12" pada zona waktu pengguna. */
export function formatDateTime(value, timezone) {
  if (!value) return '–';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone || undefined,
    }).format(date);
  } catch {
    return DATE_TIME_FALLBACK.format(date);
  }
}

export function formatDateRange(from, to) {
  return `${formatDateKey(from)} – ${formatDateKey(to)}`;
}

/** completion_rate server adalah rasio dan boleh > 1. */
export function formatPercent(ratio) {
  if (ratio == null || Number.isNaN(Number(ratio))) return '–';
  return `${Math.round(Number(ratio) * 100)}%`;
}

export function formatMinutes(minutes) {
  if (minutes == null || Number.isNaN(Number(minutes))) return '–';
  const value = Number(minutes);
  if (value < 60) return `${value} m`;
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? `${hours} j ${rest} m` : `${hours} j`;
}

/** Kelas tombol aksi inline: tap target 44px + focus ring terlihat. */
export const ACTION_BUTTON_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium ' +
  'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ' +
  'focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

export const SUBTLE_ACTION_CLASS = `${ACTION_BUTTON_CLASS} border border-primary-200 bg-white text-primary-700 hover:bg-primary-50 hover:border-primary-300`;

export const PRIMARY_ACTION_CLASS = `${ACTION_BUTTON_CLASS} bg-primary-900 text-white hover:bg-primary-800`;

export const DANGER_ACTION_CLASS = `${ACTION_BUTTON_CLASS} border border-red-200 bg-red-50 text-red-700 hover:bg-red-100`;
