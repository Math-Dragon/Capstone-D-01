jest.mock('../../src/middleware/authenticate', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'admin-uuid', email: 'admin@example.com' };
    next();
  }),
}));

jest.mock('../../src/middleware/requireAdmin', () => ({
  requireAdmin: jest.fn((req, res, next) => next()),
}));

jest.mock('../../src/middleware/rateLimiter', () => ({
  generalLimiter: jest.fn((req, res, next) => next()),
}));

jest.mock('../../src/services/admin.service', () => ({
  getAdminMetrics: jest.fn(() => ({
    summary: { totalCalls: 0, totalTokens: { prompt: 0, completion: 0, total: 0 }, estimatedCostUsd: 0, acceptRate: 0 },
    trends: { totalCalls: 0, totalTokens: 0, estimatedCostUsd: 0, acceptRate: 0 },
    byProvider: [],
    byDay: [],
    byDayAccept: [],
    recentActivity: [],
    total: 0,
  })),
}));

const request = require('supertest');
const express = require('express');
const router = require('../../src/routes/admin');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', router);
  app.use((err, req, res, next) => {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, error: err.message });
    if (err.errors) return res.status(400).json({ success: false, error: err.errors });
    res.status(500).json({ success: false, error: 'Internal server error' });
  });
  return app;
}

describe('GET /api/admin/metrics', () => {
  test('returns 200 with valid response shape', async () => {
    const res = await request(createApp()).get('/api/admin/metrics');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('trends');
    expect(res.body.data).toHaveProperty('byProvider');
    expect(res.body.data).toHaveProperty('byDay');
    expect(res.body.data).toHaveProperty('byDayAccept');
    expect(res.body.data).toHaveProperty('recentActivity');
    expect(res.body.data).toHaveProperty('total');
  });

  test('accepts valid period values', async () => {
    const app = createApp();
    for (const period of [7, 30, 90]) {
      const res = await request(app).get(`/api/admin/metrics?period=${period}`);
      expect(res.status).toBe(200);
    }
  });

  test('rejects invalid period value', async () => {
    const res = await request(createApp()).get('/api/admin/metrics?period=99');
    expect(res.status).toBe(400);
  });

  test('rejects invalid activity_limit', async () => {
    const res = await request(createApp()).get('/api/admin/metrics?activity_limit=999');
    expect(res.status).toBe(400);
  });

  test('accepts valid activity_limit', async () => {
    const res = await request(createApp()).get('/api/admin/metrics?activity_limit=50');
    expect(res.status).toBe(200);
  });

  test('accepts status filter', async () => {
    const res = await request(createApp()).get('/api/admin/metrics?status=success');
    expect(res.status).toBe(200);
  });

  test('rejects invalid status filter', async () => {
    const res = await request(createApp()).get('/api/admin/metrics?status=invalid');
    expect(res.status).toBe(400);
  });
});
