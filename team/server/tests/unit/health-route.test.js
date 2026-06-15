jest.mock('../../src/db', () => ({
  isHealthy: jest.fn(),
  pool: { query: jest.fn(), end: jest.fn() },
}));

jest.mock('../../src/services/llm-client', () => ({
  getCircuitBreakerState: jest.fn(),
}));

const { isHealthy } = require('../../src/db');
const { getCircuitBreakerState } = require('../../src/services/llm-client');
const router = require('../../src/routes/health');
const express = require('express');
const request = require('supertest');

function createApp() {
  const app = express();
  app.use('/health', router);
  return app;
}

describe('GET /health', () => {
  test('returns AI closed state when db is healthy', async () => {
    isHealthy.mockResolvedValue(true);
    getCircuitBreakerState.mockReturnValue({ status: 'closed' });
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.ai).toEqual({ status: 'closed' });
  });

  test('returns 503 when db is unhealthy', async () => {
    isHealthy.mockResolvedValue(false);
    getCircuitBreakerState.mockReturnValue({ status: 'closed' });
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.status).toBe('degraded');
    expect(res.body.data.database).toBe('disconnected');
    expect(res.body.data.ai).toEqual({ status: 'closed' });
  });

  test('returns AI open state without forcing 503 when db is healthy', async () => {
    isHealthy.mockResolvedValue(true);
    getCircuitBreakerState.mockReturnValue({ status: 'open' });

    const res = await request(createApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.ai).toEqual({ status: 'open' });
  });
});
