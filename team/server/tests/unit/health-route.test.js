jest.mock('../../src/db', () => ({
  isHealthy: jest.fn(),
}));

const { isHealthy } = require('../../src/db');
const router = require('../../src/routes/health');
const express = require('express');
const request = require('supertest');

function createApp() {
  const app = express();
  app.use('/health', router);
  return app;
}

describe('GET /health', () => {
  test('returns 200 when db is healthy', async () => {
    isHealthy.mockResolvedValue(true);
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBe('connected');
  });

  test('returns 503 when db is unhealthy', async () => {
    isHealthy.mockResolvedValue(false);
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.database).toBe('disconnected');
  });
});
