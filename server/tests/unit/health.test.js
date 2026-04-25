const request = require('supertest');
const app = require('../../src/app');

describe('GET /health', () => {
  test('returns ok with database status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('database');
  });
});

describe('GET /metrics', () => {
  test('returns prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });
});
