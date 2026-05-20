const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');

const TEST_EMAIL = `goals-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass1';

let accessToken;
let testGoalId;

beforeAll(async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

  if (registerRes.status === 429) {
    const payload = { id: 'integration-test-user-id', email: TEST_EMAIL };
    accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    return;
  }

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

  if (loginRes.status === 200) {
    accessToken = loginRes.body.data.accessToken;
  } else {
    const payload = { id: 'integration-test-user-id', email: TEST_EMAIL };
    accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  }
});

afterAll(async () => {
  if (accessToken) {
    try {
      await request(app)
        .delete('/api/goals/' + testGoalId)
        .set('Authorization', `Bearer ${accessToken}`);
    } catch {
      // Best-effort cleanup.
    }
    try {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
    } catch {
      // Best-effort cleanup.
    }
  }
});

describe('Goals API Integration', () => {
  test('POST /api/goals creates a new goal', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Belajar Node.js Integration', deadline: '2026-06-01' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.title).toBe('Belajar Node.js Integration');
    expect(res.body.data.user_id).toBeTruthy();
    testGoalId = res.body.data.id;
  });

  test('GET /api/goals returns goals list', async () => {
    const res = await request(app)
      .get('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const created = res.body.data.find(g => g.id === testGoalId);
    expect(created).toBeTruthy();
  });

  test('GET /api/goals/:id returns goal with tasks', async () => {
    const res = await request(app)
      .get(`/api/goals/${testGoalId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(testGoalId);
    expect(res.body.data).toHaveProperty('tasks');
    expect(Array.isArray(res.body.data.tasks)).toBe(true);
  });

  test('PUT /api/goals/:id updates goal fields', async () => {
    const res = await request(app)
      .put(`/api/goals/${testGoalId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated Goal Title', description: 'Added description' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Updated Goal Title');
    expect(res.body.data.description).toBe('Added description');
  });

  test('DELETE /api/goals/:id deletes the goal', async () => {
    const res = await request(app)
      .delete(`/api/goals/${testGoalId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Goal deleted');

    const getRes = await request(app)
      .get(`/api/goals/${testGoalId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(getRes.status).toBe(404);
  });

  test('GET /api/goals/:id returns 404 for non-existent goal', async () => {
    const res = await request(app)
      .get('/api/goals/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/goals rejects missing title', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('all endpoints reject unauthenticated requests', async () => {
    const endpoints = [
      { method: 'get', path: '/api/goals' },
      { method: 'post', path: '/api/goals', body: { title: 'Test' } },
      { method: 'get', path: `/api/goals/${testGoalId}` },
      { method: 'put', path: `/api/goals/${testGoalId}`, body: { title: 'Test' } },
      { method: 'delete', path: `/api/goals/${testGoalId}` },
    ];

    for (const ep of endpoints) {
      let req = request(app)[ep.method](ep.path);
      if (ep.body) req = req.send(ep.body);
      const res = await req;
      expect(res.status).toBe(401);
    }
  });
});
