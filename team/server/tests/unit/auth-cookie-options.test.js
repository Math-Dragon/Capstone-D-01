process.env.SKIP_DB_CHECK = 'true';

jest.mock('../../src/services/auth.service', () => ({
  register: jest.fn(),
  login: jest.fn(),
  googleLogin: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
}));

jest.mock('../../src/models/user.model', () => ({
  registerSchema: { parse: jest.fn((data) => data) },
  loginSchema: { parse: jest.fn((data) => data) },
}));

jest.mock('../../src/middleware/rateLimiter', () => ({
  authLimiter: (_req, _res, next) => next(),
  aiLimiter: (_req, _res, next) => next(),
  generalLimiter: (_req, _res, next) => next(),
}));

const ORIGINAL_ENV = { ...process.env };

describe('auth cookie options', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      SKIP_DB_CHECK: 'true',
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: 'https://stepup-app.vercel.app',
      DATABASE_URL: 'postgres://example',
      JWT_SECRET: '12345678901234567890123456789012',
      JWT_REFRESH_SECRET: '12345678901234567890123456789012',
      LLM_PROVIDER: 'mock',
    };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV, SKIP_DB_CHECK: 'true' };
    jest.clearAllMocks();
  });

  test('login sets refresh cookie with shared production-safe options', async () => {
    const authService = require('../../src/services/auth.service');
    authService.login.mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'u1', email: 'user@example.com' },
    });

    const request = require('supertest');
    const app = require('../../src/app');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(res.headers['set-cookie'][0]).toContain('Secure');
    expect(res.headers['set-cookie'][0]).toContain('SameSite=None');
  });

  test('google login sets refresh cookie with shared production-safe options', async () => {
    const authService = require('../../src/services/auth.service');
    authService.googleLogin.mockResolvedValue({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 'u1', email: 'user@example.com' },
    });

    const request = require('supertest');
    const app = require('../../src/app');

    const res = await request(app)
      .post('/api/auth/google')
      .send({ idToken: 'google-token' });

    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(res.headers['set-cookie'][0]).toContain('Secure');
    expect(res.headers['set-cookie'][0]).toContain('SameSite=None');
  });

  test('refresh sets refresh cookie with shared production-safe options', async () => {
    const authService = require('../../src/services/auth.service');
    authService.refresh.mockResolvedValue({
      accessToken: 'next-at',
      refreshToken: 'next-rt',
    });

    const request = require('supertest');
    const app = require('../../src/app');

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'refreshToken=old-rt');

    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(res.headers['set-cookie'][0]).toContain('Secure');
    expect(res.headers['set-cookie'][0]).toContain('SameSite=None');
  });
});
