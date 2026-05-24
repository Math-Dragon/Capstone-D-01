const request = require('supertest');
const app = require('../../src/app');

describe('Protected routes require authentication', () => {
  const routes = [
    { method: 'get', path: '/api/goals' },
    { method: 'post', path: '/api/goals' },
    { method: 'get', path: '/api/goals/test-id' },
    { method: 'put', path: '/api/goals/test-id' },
    { method: 'delete', path: '/api/goals/test-id' },
    { method: 'get', path: '/api/tasks' },
    { method: 'post', path: '/api/tasks' },
    { method: 'get', path: '/api/tasks/test-id' },
    { method: 'put', path: '/api/tasks/test-id' },
    { method: 'delete', path: '/api/tasks/test-id' },
    { method: 'get', path: '/api/progress/weekly' },
    { method: 'get', path: '/api/progress/trend' },
    { method: 'post', path: '/api/ai/plan/suggest' },
  ];

  test.each(routes)('$method $path returns 401 without token', async ({ method, path }) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });
});

describe('POST /api/goals validation', () => {
  test('rejects empty body', async () => {
    const res = await request(app)
      .post('/api/goals')
      .send({});
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/goals/:id validation', () => {
  test('rejects invalid status', async () => {
    const token = 'Bearer invalid.token.here';
    const res = await request(app)
      .put('/api/goals/test-id')
      .set('Authorization', token)
      .send({ status: 'invalid_status' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/tasks validation', () => {
  test('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({});
    expect(res.status).toBe(401);
  });
});

describe('POST /api/ai/plan/suggest validation', () => {
  test('rejects missing goalId', async () => {
    const res = await request(app)
      .post('/api/ai/plan/suggest')
      .send({});
    expect(res.status).toBe(401);
  });
});
