const request = require('supertest');
const app = require('../../src/app');

const TEST_EMAIL = `tasks-test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TaskTest1';

let accessToken;
let testGoalId;
let testTaskId;

beforeAll(async () => {
  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

  if (registerRes.status === 429) {
    const jwt = require('jsonwebtoken');
    const payload = { id: 'tasks-test-user-id', email: TEST_EMAIL };
    accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
    return;
  }

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

  if (loginRes.status === 200) {
    accessToken = loginRes.body.data.accessToken;
  } else {
    const jwt = require('jsonwebtoken');
    const payload = { id: 'tasks-test-user-id', email: TEST_EMAIL };
    accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  }
});

afterAll(async () => {
  try {
    if (testTaskId) {
      await request(app)
        .delete(`/api/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${accessToken}`);
    }
  } catch { /* ignore cleanup error */ }
  try {
    if (testGoalId) {
      await request(app)
        .delete(`/api/goals/${testGoalId}`)
        .set('Authorization', `Bearer ${accessToken}`);
    }
  } catch { /* ignore cleanup error */ }
    try {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
    } catch { /* ignore cleanup error */ }
});

describe('Tasks API Integration', () => {
  test('creates a goal to hold tasks', async () => {
    const res = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Task Test Goal' });

    expect(res.status).toBe(201);
    testGoalId = res.body.data.id;
  });

  test('POST /api/tasks creates a task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Belajar React Testing',
        description: 'Write comprehensive tests',
        duration_estimate: 45,
        planned_date: '2026-06-01',
        planned_slot: 'morning',
        goal_id: testGoalId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Belajar React Testing');
    expect(res.body.data.goal_id).toBe(testGoalId);
    expect(res.body.data.status).toBe('todo');
    expect(res.body.data.source).toBe('manual');
    testTaskId = res.body.data.id;
  });

  test('GET /api/tasks lists tasks', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/tasks filters by goalId', async () => {
    const res = await request(app)
      .get(`/api/tasks?goalId=${testGoalId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    for (const task of res.body.data) {
      expect(task.goal_id).toBe(testGoalId);
    }
  });

  test('GET /api/tasks/:id returns task detail', async () => {
    const res = await request(app)
      .get(`/api/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(testTaskId);
    expect(res.body.data.title).toBe('Belajar React Testing');
  });

  test('PUT /api/tasks/:id updates task', async () => {
    const res = await request(app)
      .put(`/api/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'Updated Task Title', duration_estimate: 60 });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Task Title');
    expect(res.body.data.duration_estimate).toBe(60);
  });

  test('PATCH /api/tasks/:id also updates task', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ description: 'Patched description' });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Patched description');
  });

  test('POST /api/tasks rejects invalid duration', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Bad Task',
        duration_estimate: 5,
        goal_id: testGoalId,
      });

    expect(res.status).toBe(400);
  });

  test('POST /api/tasks rejects non-existent goal_id', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Orphan Task',
        duration_estimate: 30,
        goal_id: '00000000-0000-0000-0000-000000000000',
      });

    expect(res.status).toBe(404);
  });

  test('GET /api/tasks/:id returns 404 for non-existent task', async () => {
    const res = await request(app)
      .get('/api/tasks/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  test('DELETE /api/tasks/:id deletes task', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Task deleted');

    const getRes = await request(app)
      .get(`/api/tasks/${testTaskId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(getRes.status).toBe(404);
  });
});
