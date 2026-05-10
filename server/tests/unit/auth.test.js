const request = require('supertest');
const app = require('../../src/app');

describe('POST /api/auth/register validation', () => {
  test('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'Passw0rd' });
    expect([400, 429]).toContain(res.status);
  });

  test('rejects weak password - no uppercase', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test1@example.com', password: 'alllowercase1' });
    expect([400, 429]).toContain(res.status);
  });

  test('rejects weak password - no digit', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test2@example.com', password: 'NoNumbersHere' });
    expect([400, 429]).toContain(res.status);
  });
});

describe('POST /api/auth/login validation', () => {
  test('rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect([400, 429]).toContain(res.status);
  });

  test('rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad', password: 'x' });
    expect([400, 429]).toContain(res.status);
  });
});

describe('Auth guards', () => {
  test('GET /api/auth/me rejects unauthenticated request', async () => {
    const res = await request(app).get('/api/auth/me');
    expect([401, 429]).toContain(res.status);
  });

  test('POST /api/auth/refresh rejects missing refresh token', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect([401, 429]).toContain(res.status);
  });
});
