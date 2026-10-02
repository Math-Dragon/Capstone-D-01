import api from '../../../services/api';

// api.js sudah meng-unwrap response.data.data, jadi setiap call di bawah
// langsung mengembalikan objek data dan melempar Error dengan .statusCode/.code.

export function newClientEventId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback untuk environment tanpa crypto.randomUUID (harus tetap unik per event)
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function withSignal(config, signal) {
  if (signal) config.signal = signal;
  return config;
}

function compact(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));
}

export const getOverview = (period = '7d', { signal } = {}) =>
  api.get('/progress/overview', withSignal({ params: { period } }, signal));

export const getHistory = ({ filter = 'all', limit = 20, cursor } = {}, { signal } = {}) =>
  api.get(
    '/progress/history',
    withSignal({ params: compact({ filter, limit, cursor }) }, signal)
  );

export const getHistoryDetail = (id, { signal } = {}) =>
  api.get(`/progress/history/${id}`, withSignal({}, signal));

// 409 CONFLICT jika `version` basi (kode error diteruskan apa adanya).
export const correctHistory = (id, { mood, note, version, reason_code } = {}) =>
  api.patch(`/progress/history/${id}`, compact({ mood, note, version, reason_code }));

export const deleteHistory = (id) => api.delete(`/progress/history/${id}`);

export const createEvent = (payload = {}) =>
  api.post('/progress/events', {
    client_event_id: newClientEventId(),
    source: 'manual',
    ...payload,
  });

export const getTrend = (params = {}, { signal } = {}) =>
  api.get('/progress/trend', withSignal({ params: compact(params) }, signal));

export const getStats = ({ signal } = {}) => api.get('/progress/stats', withSignal({}, signal));

export const progressService = {
  getOverview,
  getHistory,
  getHistoryDetail,
  correctHistory,
  deleteHistory,
  createEvent,
  getTrend,
  getStats,
  newClientEventId,
};

export default progressService;
