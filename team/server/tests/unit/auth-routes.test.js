process.env.SKIP_DB_CHECK = 'true';

jest.mock('../../src/services/auth.service', () => ({
  register: jest.fn(),
  login: jest.fn(),
  googleLogin: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
}));

jest.mock('../../src/middleware/authenticate', () => ({
  authenticate: (req, res, next) => {
    if (req.headers['x-test-user']) {
      req.user = { id: req.headers['x-test-user'], email: 'test@test.com' };
      next();
    } else {
      res.status(401).json({ success: false });
    }
  },
}));

jest.mock('../../src/models/user.model', () => ({
  registerSchema: { parse: jest.fn((d) => d) },
  loginSchema: { parse: jest.fn((d) => d) },
}));

const authService = require('../../src/services/auth.service');
const { registerSchema, loginSchema } = require('../../src/models/user.model');
const router = require('../../src/routes/auth');
const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', router);
  app.use((err, req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: { message: err.message } });
  });
  return app;
}

beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/register', () => {
  test('succeeds and returns 201', async () => {
    authService.register.mockResolvedValue({ id: 'u1', email: 'a@b.com' });
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: 'Pass1' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('handles error via next', async () => {
    registerSchema.parse.mockImplementationOnce(() => { throw new Error('Invalid'); });
    const res = await request(createApp())
      .post('/api/auth/register')
      .send({ email: 'bad' });
    expect(res.status).toBe(500);
  });
});

describe('POST /api/auth/login', () => {
  test('succeeds and sets cookie', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'at', refreshToken: 'rt', user: { id: 'u1', email: 'a@b.com' },
    });
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'Pass1' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  test('handles error via next', async () => {
    loginSchema.parse.mockImplementationOnce(() => { throw new Error('Invalid'); });
    const res = await request(createApp())
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(500);
  });
});

describe('POST /api/auth/google', () => {
  test('succeeds with idToken', async () => {
    authService.googleLogin.mockResolvedValue({
      accessToken: 'at', refreshToken: 'rt', user: { id: 'u1', email: 'a@b.com' },
    });
    const res = await request(createApp())
      .post('/api/auth/google')
      .send({ idToken: 'tok123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 400 when idToken missing', async () => {
    const res = await request(createApp())
      .post('/api/auth/google')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/refresh', () => {
  test('succeeds with cookie', async () => {
    authService.refresh.mockResolvedValue({ accessToken: 'at2', refreshToken: 'rt2' });
    const res = await request(createApp())
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=rt1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('returns 401 when no cookie', async () => {
    const res = await request(createApp())
      .post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  test('returns user when authenticated', async () => {
    const res = await request(createApp())
      .get('/api/auth/me')
      .set('x-test-user', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /api/auth/logout', () => {
  test('succeeds when authenticated', async () => {
    authService.logout.mockResolvedValue();
    const res = await request(createApp())
      .post('/api/auth/logout')
      .set('x-test-user', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
