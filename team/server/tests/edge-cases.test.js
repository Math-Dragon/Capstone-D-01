require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

const TEST_EMAIL = `edge-test-${Date.now()}@test.com`;
const TEST_PASSWORD = 'test12345678';
const TEST_EMAIL_2 = `edge-other-${Date.now()}@test.com`;

let token;
let token2;
let userId2;

beforeAll(async () => {
  try {
    await db.query("DELETE FROM refresh_tokens WHERE token_hash LIKE 'edge%'");
  } catch { /* ignore */ }
  try {
    await db.query("DELETE FROM users WHERE email LIKE 'edge-test-%' OR email LIKE 'edge-other-%'");
  } catch { /* best-effort cleanup */ }

  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

  if (registerRes.status === 201) {
    token = registerRes.body.data.accessToken;
  } else {
    const jwt = require('jsonwebtoken');
    token = jwt.sign({ id: 'edge-test-user-id', email: TEST_EMAIL }, process.env.JWT_SECRET, { expiresIn: '15m' });
  }
});

afterAll(async () => {
  try {
    if (userId2) {
      await db.query('DELETE FROM users WHERE id = $1', [userId2]);
    }
  } catch { /* ignore */ }
  try {
    await db.query("DELETE FROM refresh_tokens WHERE token_hash LIKE 'edge%'");
  } catch { /* ignore */ }
  try {
    await db.query("DELETE FROM users WHERE email LIKE 'edge-test-%' OR email LIKE 'edge-other-%'");
  } catch { /* ignore */ }
});

describe('Edge Cases', () => {
  test('suggest dengan goal_id yang tidak ada mengembalikan 404', async () => {
    const res = await request(app)
      .post('/api/ai/plan/suggest')
      .set('Authorization', `Bearer ${token}`)
      .send({ goal_id: '00000000-0000-0000-0000-000000000000', week_start: '2026-04-13' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('suggest dengan format tanggal salah mengembalikan 400', async () => {
    const res = await request(app)
      .post('/api/ai/plan/suggest')
      .set('Authorization', `Bearer ${token}`)
      .send({ goal_id: '00000000-0000-0000-0000-000000000000', week_start: 'bukan-tanggal' });

    expect(res.status).toBe(400);
  });

  test('PATCH status dengan transisi tidak valid (done → todo) mengembalikan 400', async () => {
    const goalRes = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Edge Test Goal' });

    expect(goalRes.status).toBe(201);
    const goalId = goalRes.body.data.id;

    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        goal_id: goalId,
        title: 'Edge Test Task',
        duration_estimate: 30,
        planned_date: '2026-04-15',
        planned_slot: 'morning',
      });

    expect(taskRes.status).toBe(201);
    const taskId = taskRes.body.data.id;

    await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'done' });

    const res = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'todo' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');

    await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    await request(app)
      .delete(`/api/goals/${goalId}`)
      .set('Authorization', `Bearer ${token}`);
  });

  test('goals milik user lain tidak bisa diakses', async () => {
    const registerRes2 = await request(app)
      .post('/api/auth/register')
      .send({ email: TEST_EMAIL_2, password: TEST_PASSWORD });

    if (registerRes2.status === 201) {
      token2 = registerRes2.body.data.accessToken;
    } else {
      const jwt = require('jsonwebtoken');
      token2 = jwt.sign({ id: 'edge-other-user-id', email: TEST_EMAIL_2 }, process.env.JWT_SECRET, { expiresIn: '15m' });
    }

    const user2Goal = await request(app)
      .post('/api/goals')
      .set('Authorization', `Bearer ${token2}`)
      .send({ title: 'User 2 Goal' });

    expect(user2Goal.status).toBe(201);

    const res = await request(app)
      .patch(`/api/goals/${user2Goal.body.data.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hijacked' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');

    await request(app)
      .delete(`/api/goals/${user2Goal.body.data.id}`)
      .set('Authorization', `Bearer ${token2}`);
  });

  test('export tanpa parameter week_start mengembalikan 400', async () => {
    const res = await request(app)
      .get('/api/export/weekly')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('week_start');
  });
});
