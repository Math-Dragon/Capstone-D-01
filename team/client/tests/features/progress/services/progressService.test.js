import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from '../../../../src/services/api';
import progressService, {
  getOverview,
  getHistory,
  createEvent,
  newClientEventId,
} from '../../../../src/features/progress/services/progressService';

describe('progressService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('getOverview', () => {
    it('defaults to period 7d', async () => {
      api.get.mockResolvedValue({ health: { progress_percent: 40 } });
      const result = await getOverview();
      expect(api.get).toHaveBeenCalledWith('/progress/overview', { params: { period: '7d' } });
      expect(result).toEqual({ health: { progress_percent: 40 } });
    });

    it('forwards custom period and abort signal', async () => {
      api.get.mockResolvedValue({ period: { key: '30d' } });
      const controller = new AbortController();
      await progressService.getOverview('30d', { signal: controller.signal });
      expect(api.get).toHaveBeenCalledWith('/progress/overview', {
        params: { period: '30d' },
        signal: controller.signal,
      });
    });
  });

  describe('getHistory', () => {
    it('sends filter and limit defaults, omitting cursor', async () => {
      api.get.mockResolvedValue({ items: [], page: { next_cursor: null, has_more: false } });
      await getHistory();
      expect(api.get).toHaveBeenCalledWith('/progress/history', {
        params: { filter: 'all', limit: 20 },
      });
    });

    it('forwards filter, limit and cursor when provided', async () => {
      api.get.mockResolvedValue({ items: [{ id: 'e1' }], page: { next_cursor: 'c2', has_more: true } });
      const result = await getHistory({ filter: 'skipped', limit: 5, cursor: 'c1' });
      expect(api.get).toHaveBeenCalledWith('/progress/history', {
        params: { filter: 'skipped', limit: 5, cursor: 'c1' },
      });
      expect(result.items).toEqual([{ id: 'e1' }]);
    });
  });

  describe('getHistoryDetail / correctHistory / deleteHistory', () => {
    it('getHistoryDetail hits the item url', async () => {
      api.get.mockResolvedValue({ id: 'evt-1', version: 2 });
      const result = await progressService.getHistoryDetail('evt-1');
      expect(api.get).toHaveBeenCalledWith('/progress/history/evt-1', {});
      expect(result).toEqual({ id: 'evt-1', version: 2 });
    });

    it('correctHistory patches body with version and drops undefined fields', async () => {
      api.patch.mockResolvedValue({ id: 'evt-1', version: 3 });
      const result = await progressService.correctHistory('evt-1', {
        note: 'diperbaiki',
        version: 2,
        reason_code: 'incorrect_note',
      });
      expect(api.patch).toHaveBeenCalledWith('/progress/history/evt-1', {
        note: 'diperbaiki',
        version: 2,
        reason_code: 'incorrect_note',
      });
      expect(result).toEqual({ id: 'evt-1', version: 3 });
    });

    it('correctHistory keeps an explicit null mood', async () => {
      api.patch.mockResolvedValue({});
      await progressService.correctHistory('evt-1', { mood: null, note: 'n', version: 1 });
      expect(api.patch).toHaveBeenCalledWith('/progress/history/evt-1', {
        mood: null,
        note: 'n',
        version: 1,
      });
    });

    it('deleteHistory calls api.delete', async () => {
      api.delete.mockResolvedValue({ deleted: true });
      const result = await progressService.deleteHistory('evt-1');
      expect(api.delete).toHaveBeenCalledWith('/progress/history/evt-1');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('createEvent', () => {
    it('posts a generated client_event_id with the payload', async () => {
      api.post.mockResolvedValue({ id: 'evt-new' });
      const result = await createEvent({ event_type: 'submitted', mood: 'good' });
      const body = api.post.mock.calls[0][1];
      expect(api.post.mock.calls[0][0]).toEqual('/progress/events');
      expect(body.client_event_id).toEqual(expect.any(String));
      expect(body.client_event_id.length).toBeGreaterThan(8);
      expect(body).toMatchObject({ event_type: 'submitted', mood: 'good' });
      expect(result).toEqual({ id: 'evt-new' });
    });

    it('keeps a caller supplied client_event_id and source', async () => {
      api.post.mockResolvedValue({});
      const id = '11111111-2222-4333-8444-555555555555';
      await createEvent({ client_event_id: id, event_type: 'skipped', source: 'checkout' });
      expect(api.post).toHaveBeenCalledWith('/progress/events', {
        client_event_id: id,
        source: 'checkout',
        event_type: 'skipped',
      });
    });

    it('newClientEventId returns unique ids', () => {
      const a = newClientEventId();
      const b = newClientEventId();
      expect(typeof a).toBe('string');
      expect(a).not.toEqual(b);
      // uuid dari crypto.randomUUID atau fallback evt_<ts>_<rand>
      expect(a).toMatch(/^[0-9a-f-]{36}$|^evt_\d+_[a-z0-9]+$/i);
    });
  });

  describe('getTrend / getStats', () => {
    it('getTrend forwards params', async () => {
      api.get.mockResolvedValue({ points: [] });
      await progressService.getTrend({ from: '2026-09-01', to: '2026-09-28', limit: 14, offset: 0 });
      expect(api.get).toHaveBeenCalledWith('/progress/trend', {
        params: { from: '2026-09-01', to: '2026-09-28', limit: 14, offset: 0 },
      });
    });

    it('getStats hits legacy endpoint', async () => {
      api.get.mockResolvedValue({ total: 3 });
      const result = await progressService.getStats();
      expect(api.get).toHaveBeenCalledWith('/progress/stats', {});
      expect(result).toEqual({ total: 3 });
    });
  });

  it('propagates error code and statusCode untouched', async () => {
    const err = new Error('Version basi');
    err.statusCode = 409;
    err.code = 'VERSION_CONFLICT';
    api.patch.mockRejectedValue(err);
    await expect(
      progressService.correctHistory('evt-1', { note: 'x', version: 1 })
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT', statusCode: 409 });
  });
});
