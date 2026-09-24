jest.mock('../../src/services/progress.service', () => ({
  getStats: jest.fn(),
  getWeekly: jest.fn(),
  getTrend: jest.fn(),
  createEvent: jest.fn(),
  getHistory: jest.fn(),
  getHistoryDetail: jest.fn(),
  correctHistory: jest.fn(),
  deleteHistory: jest.fn(),
  getOverview: jest.fn(),
}));

jest.mock('../../src/middleware/authenticate', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'test-user-id', email: 'test@test.com' };
    next();
  },
}));

const progressService = require('../../src/services/progress.service');
const router = require('../../src/routes/progress');
const express = require('express');
const request = require('supertest');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/progress', router);
  app.use((err, req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('GET /api/progress/stats', () => {
  test('returns stats', async () => {
    progressService.getStats.mockResolvedValue({ totalTasks: 5, completedTasks: 3 });
    const res = await request(createApp()).get('/api/progress/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalTasks).toBe(5);
  });

  test('handles error via next', async () => {
    progressService.getStats.mockRejectedValue(new Error('DB error'));
    const res = await request(createApp()).get('/api/progress/stats');
    expect(res.status).toBe(500);
  });
});

describe('GET /api/progress/weekly', () => {
  test('succeeds with valid week param', async () => {
    progressService.getWeekly.mockResolvedValue({ week: '2026-W18', rate: 0.8 });
    const res = await request(createApp()).get('/api/progress/weekly?week=2026-W18');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 400 when week missing', async () => {
    const res = await request(createApp()).get('/api/progress/weekly');
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid week format', async () => {
    const res = await request(createApp()).get('/api/progress/weekly?week=invalid');
    expect(res.status).toBe(400);
  });

  test('handles error via next', async () => {
    progressService.getWeekly.mockRejectedValue(new Error('fail'));
    const res = await request(createApp()).get('/api/progress/weekly?week=2026-W18');
    expect(res.status).toBe(500);
  });
});

describe('GET /api/progress/trend', () => {
  test('returns trend data', async () => {
    progressService.getTrend.mockResolvedValue([{ week: '2026-W18', rate: 0.7 }]);
    const res = await request(createApp()).get('/api/progress/trend');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('passes limit and offset params', async () => {
    progressService.getTrend.mockResolvedValue([]);
    await request(createApp()).get('/api/progress/trend?limit=5&offset=10');
    expect(progressService.getTrend).toHaveBeenCalledWith('test-user-id', {
      from: undefined, to: undefined, limit: 5, offset: 10,
    });
  });

  test('passes from and to params', async () => {
    progressService.getTrend.mockResolvedValue([]);
    await request(createApp()).get('/api/progress/trend?from=2026-W01&to=2026-W18');
    expect(progressService.getTrend).toHaveBeenCalledWith('test-user-id', {
      from: '2026-W01', to: '2026-W18', limit: undefined, offset: undefined,
    });
  });

  test('handles error via next', async () => {
    progressService.getTrend.mockRejectedValue(new Error('fail'));
    const res = await request(createApp()).get('/api/progress/trend');
    expect(res.status).toBe(500);
  });
});

describe('POST /api/progress/events', () => {
  const validBody = {
    client_event_id: '123e4567-e89b-12d3-a456-426614174000',
    event_type: 'submitted',
    mood: 'good',
    source: 'manual',
    context: {},
  };

  test('returns 201 on create', async () => {
    progressService.createEvent.mockResolvedValue({
      data: { id: 'e1', event_type: 'submitted', created_at: '2026-09-24T10:00:00.000Z' },
      replayed: false,
    });
    const res = await request(createApp()).post('/api/progress/events').send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('returns 200 on idempotent replay', async () => {
    progressService.createEvent.mockResolvedValue({ data: { id: 'e1' }, replayed: true });
    const res = await request(createApp()).post('/api/progress/events').send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.meta.idempotent_replay).toBe(true);
  });

  test('returns 400 for invalid body', async () => {
    const res = await request(createApp()).post('/api/progress/events').send({ event_type: 'submitted' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/progress/history', () => {
  test('applies query defaults and returns history', async () => {
    progressService.getHistory.mockResolvedValue({ items: [], page: { next_cursor: null, has_more: false } });
    const res = await request(createApp()).get('/api/progress/history');
    expect(res.status).toBe(200);
    expect(progressService.getHistory).toHaveBeenCalledWith('test-user-id', { filter: 'all', limit: 20 });
  });

  test('maps service errors to status', async () => {
    const err = new Error('Cursor riwayat tidak valid.');
    err.statusCode = 400;
    progressService.getHistory.mockRejectedValue(err);
    const res = await request(createApp()).get('/api/progress/history?cursor=bogus');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/progress/history/:id', () => {
  test('returns detail', async () => {
    progressService.getHistoryDetail.mockResolvedValue({ id: 'e1', version: 2 });
    const res = await request(createApp()).get('/api/progress/history/123e4567-e89b-12d3-a456-426614174000');
    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(2);
  });

  test('returns 400 for non-uuid id', async () => {
    const res = await request(createApp()).get('/api/progress/history/not-a-uuid');
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/progress/history/:id', () => {
  const id = '123e4567-e89b-12d3-a456-426614174000';

  test('forwards the integer version and returns detail', async () => {
    progressService.correctHistory.mockResolvedValue({ id, version: 1 });
    const res = await request(createApp()).patch(`/api/progress/history/${id}`).send({ mood: 'good', version: 0 });
    expect(res.status).toBe(200);
    expect(progressService.correctHistory).toHaveBeenCalledWith('test-user-id', id, {
      mood: 'good',
      version: 0,
    });
  });

  test('returns 400 when no correctable field is present', async () => {
    const res = await request(createApp()).patch(`/api/progress/history/${id}`).send({ version: 0 });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/progress/history/:id', () => {
  test('deletes', async () => {
    progressService.deleteHistory.mockResolvedValue({ id: 'e1', deleted: true });
    const res = await request(createApp()).delete('/api/progress/history/123e4567-e89b-12d3-a456-426614174000');
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });
});

describe('GET /api/progress/overview', () => {
  test('defaults period to 7d', async () => {
    progressService.getOverview.mockResolvedValue({ period: { key: '7d' } });
    const res = await request(createApp()).get('/api/progress/overview');
    expect(res.status).toBe(200);
    expect(progressService.getOverview).toHaveBeenCalledWith('test-user-id', '7d');
  });
});
