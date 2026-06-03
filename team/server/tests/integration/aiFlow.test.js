const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');

const TEST_EMAIL = `ai-flow-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass1';

let accessToken;
let testGoalId;
let recommendationId;
let createdTaskId;

beforeAll(async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

  if (registerRes.status === 429) {
    const payload = { id: 'integration-test-user-id', email: TEST_EMAIL };
    accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  } else {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    accessToken = loginRes.body.data?.accessToken;
    if (!accessToken) {
      const payload = { id: 'integration-test-user-id', email: TEST_EMAIL };
      accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    }
  }
});

afterAll(async () => {
  if (accessToken) {
    try {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
    } catch {
      // cleanup best-effort
    }
  }
});

describe('AI Flow Integration', () => {
  test('POST /api/goals creates a goal for AI suggestion', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Belajar Automated Testing', deadline: '2026-07-01' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    testGoalId = res.body.data.id;
  });

  test('POST /api/ai/plan/suggest returns AI recommendation', async () => {
    const res = await request(app)
      .post('/api/ai/plan/suggest')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ goalId: testGoalId, context: 'Belajar integration testing dengan Jest dan supertest' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('recommendationId');
    expect(res.body.data).toHaveProperty('tasks');
    expect(Array.isArray(res.body.data.tasks)).toBe(true);
    expect(res.body.data.tasks.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.tasks[0]).toHaveProperty('title');
    expect(res.body.data.tasks[0]).toHaveProperty('duration_estimate');
    expect(res.body.data.tasks[0]).toHaveProperty('rationale');
    recommendationId = res.body.data.recommendationId;
  });

  test('GET /api/ai/recommendations/:id/accept accepts recommendation', async () => {
    const res = await request(app)
      .post(`/api/ai/recommendations/${recommendationId}/accept`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('GET /api/tasks returns created tasks from accepted recommendation', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    createdTaskId = res.body.data[0].id;
  });

  test('PATCH /api/tasks/:id/status transitions todo -> done', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${createdTaskId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'done', actual_duration: 30 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('done');
    expect(res.body.data.actual_duration).toBe(30);
  });

  test('PATCH /api/tasks/:id/status rejects done -> todo transition', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${createdTaskId}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'todo' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  test('PATCH /api/tasks/:id reschedules task to new date', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ planned_date: '2026-07-15', planned_slot: 'afternoon' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.planned_date).toBe('2026-07-15');
    expect(res.body.data.planned_slot).toBe('afternoon');
  });

  test('GET /api/coach/recommendations/metrics returns acceptance metrics', async () => {
    const res = await request(app)
      .get('/api/coach/recommendations/metrics')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('ai_tasks_suggested_total');
    expect(res.body.data).toHaveProperty('ai_tasks_accepted_total');
    expect(res.body.data).toHaveProperty('accept_rate');
  });

  test('all endpoints reject unauthenticated requests', async () => {
    const endpoints = [
      { method: 'post', path: '/api/ai/plan/suggest', body: { goalId: testGoalId } },
      { method: 'get', path: '/api/tasks' },
      { method: 'get', path: '/api/coach/recommendations/metrics' },
    ];

    for (const ep of endpoints) {
      let req = request(app)[ep.method](ep.path);
      if (ep.body) req = req.send(ep.body);
      const res = await req;
      expect(res.status).toBe(401);
    }
  });
});
