jest.resetModules();
jest.doMock('../../src/db', () => ({
  isHealthy: jest.fn(async () => true),
  pool: { query: jest.fn(), end: jest.fn() },
}));

const request = require('supertest');
const app = require('../../src/app');

describe('GET /health', () => {
  test('returns ok with database status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('database');
    expect(res.body.data.ai.status).toBeDefined();
  });
});

describe('GET /metrics', () => {
  test('returns prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });
});
