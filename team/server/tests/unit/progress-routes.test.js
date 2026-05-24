jest.mock('../../src/services/progress.service', () => ({
  getStats: jest.fn(),
  getWeekly: jest.fn(),
  getTrend: jest.fn(),
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
