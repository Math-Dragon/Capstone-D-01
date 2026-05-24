process.env.RATE_LIMIT_WINDOW_MS = '1000';
process.env.AUTH_RATE_LIMIT_MAX = '5';
process.env.AI_RATE_LIMIT_MAX = '20';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const config = require('../../src/config');
const { authLimiter, aiLimiter } = require('../../src/middleware/rateLimiter');

const loopbackIp = '::ffff:127.0.0.1';
const userOne = 'rate-limit-user-1';
const userTwo = 'rate-limit-user-2';
const userThree = 'rate-limit-user-3';
const userFour = 'rate-limit-user-4';

function makeToken(id, email = `${id}@example.com`) {
  return jwt.sign({ id, email }, config.jwtSecret, { expiresIn: '15m' });
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('Rate limiting', () => {
  beforeEach(() => {
    aiLimiter.resetKey(loopbackIp);
    aiLimiter.resetKey(userOne);
    aiLimiter.resetKey(userTwo);
    aiLimiter.resetKey(userThree);
    aiLimiter.resetKey(userFour);
    authLimiter.resetKey(loopbackIp);
  });

  afterAll(() => {
    aiLimiter.resetKey(loopbackIp);
    aiLimiter.resetKey(userOne);
    aiLimiter.resetKey(userTwo);
    aiLimiter.resetKey(userThree);
    aiLimiter.resetKey(userFour);
    authLimiter.resetKey(loopbackIp);
  });

  test('TC-10: blocks /api/ai/* on the 21st request within 1 minute', async () => {
    let res;
    const token = makeToken(userOne);

    for (let i = 0; i < 21; i += 1) {
      res = await request(app)
        .post('/api/ai/plan/suggest')
        .set('Authorization', `Bearer ${token}`)
        .send({});
    }

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  test('TC-11: blocks /api/auth/* on the 6th request within 1 minute', async () => {
    let res;

    for (let i = 0; i < 6; i += 1) {
      res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: 'wrong-password' });
    }

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  test('TC-12: returns a clear 429 message with retry information', async () => {
    let res;

    for (let i = 0; i < 6; i += 1) {
      res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: 'wrong-password' });
    }

    expect(res.status).toBe(429);
    expect(res.body.error.message).toMatch(/Too many auth attempts, please try again in \d+ seconds/);
    expect(res.body.error.retryAfterSeconds).toEqual(expect.any(Number));
    expect(res.body.error.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('TC-15: allows requests again after the rate limit window resets', async () => {
    let res;

    for (let i = 0; i < 6; i += 1) {
      res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: 'wrong-password' });
    }

    expect(res.status).toBe(429);

    await wait(1100);

    res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invalid-email', password: 'wrong-password' });

    expect(res.status).not.toBe(429);
  });

  test('TC-16: applies /api/ai/* limit per authenticated user', async () => {
    const tokenOne = makeToken(userOne);
    const tokenTwo = makeToken(userTwo);
    let res;

    for (let i = 0; i < 20; i += 1) {
      res = await request(app)
        .post('/api/ai/plan/suggest')
        .set('Authorization', `Bearer ${tokenOne}`)
        .send({});
      expect(res.status).not.toBe(429);
    }

    res = await request(app)
      .post('/api/ai/plan/suggest')
      .set('Authorization', `Bearer ${tokenTwo}`)
      .send({});

    expect(res.status).not.toBe(429);
  });

  test('TC-17: applies /api/auth/* limit per IP address', async () => {
    let res;

    for (let i = 0; i < 6; i += 1) {
      res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email', password: 'wrong-password' });
    }

    expect(res.status).toBe(429);
  });

  test('TC-18: includes standard rate limit headers', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invalid-email', password: 'wrong-password' });

    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
    expect(res.headers['ratelimit-reset']).toBeDefined();
  });

  test('TC-21: stays stable during light parallel AI traffic', async () => {
    const token = makeToken(userThree);
    const responses = await Promise.all(
      Array.from({ length: 10 }, () => request(app)
        .post('/api/ai/plan/suggest')
        .set('Authorization', `Bearer ${token}`)
        .send({}))
    );

    expect(responses).toHaveLength(10);
    expect(responses.every((res) => res.status !== 429)).toBe(true);
  });

  test('TC-22: does not allow simple X-Forwarded-For bypass for auth limit', async () => {
    let res;

    for (let i = 0; i < 6; i += 1) {
      res = await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', `203.0.113.${i + 1}`)
        .send({ email: 'invalid-email', password: 'wrong-password' });
    }

    expect(res.status).toBe(429);
  });
});
