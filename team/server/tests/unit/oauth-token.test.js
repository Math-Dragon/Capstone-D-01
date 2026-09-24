process.env.SKIP_DB_CHECK = 'true';

jest.mock('../../src/services/auth.service', () => ({
  verifyLoginOtp: jest.fn(),
  refresh: jest.fn(),
}));

const ORIGINAL_ENV = { ...process.env };

function prepareEnv() {
  process.env = {
    ...ORIGINAL_ENV,
    SKIP_DB_CHECK: 'true',
    NODE_ENV: 'test',
    DATABASE_URL: 'postgres://example',
    JWT_SECRET: '12345678901234567890123456789012',
    JWT_REFRESH_SECRET: '12345678901234567890123456789012',
    LLM_PROVIDER: 'mock',
  };
}

function createApp() {
  prepareEnv();
  const router = require('../../src/routes/oauth');
  const { responseEnricher } = require('../../src/middleware/responseEnricher');
  const express = require('express');
  const cookieParser = require('cookie-parser');

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(responseEnricher);
  app.use('/api/auth/oauth', express.urlencoded({ extended: false }), router);
  app.use((err, req, res, _next) => {
    res.status(err.statusCode || 500).json({ error: 'server_error' });
  });
  return app;
}

const GRANT_EMAIL_OTP = 'urn:stepup:params:grant-type:email-otp';

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  prepareEnv();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV, SKIP_DB_CHECK: 'true' };
});

describe('POST /api/auth/oauth/token — email OTP grant', () => {
  test('issues RFC 6749 token response without the response envelope', async () => {
    const authService = require('../../src/services/auth.service');
    const request = require('supertest');
    authService.verifyLoginOtp.mockResolvedValue({
      accessToken: 'at', refreshToken: 'rt', user: { id: 'u1', email: 'user@test.com' },
    });

    const res = await request(createApp())
      .post('/api/auth/oauth/token')
      .type('form')
      .send({ grant_type: GRANT_EMAIL_OTP, username: 'user@test.com', otp: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBe('at');
    expect(res.body.token_type).toBe('Bearer');
    expect(res.body.expires_in).toBeGreaterThan(0);
    expect(res.body.refresh_token).toBeUndefined();
    expect(res.body.meta).toBeUndefined();
    expect(res.body.success).toBeUndefined();
    expect(res.headers['set-cookie'].join(';')).toContain('refreshToken=rt');
  });

  test('returns invalid_grant for a rejected code', async () => {
    const authService = require('../../src/services/auth.service');
    const request = require('supertest');
    const err = new Error('Kode OTP tidak valid');
    err.code = 'INVALID_OTP';
    authService.verifyLoginOtp.mockRejectedValue(err);

    const res = await request(createApp())
      .post('/api/auth/oauth/token')
      .type('form')
      .send({ grant_type: GRANT_EMAIL_OTP, username: 'user@test.com', otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
    expect(res.body.meta).toBeUndefined();
  });

  test('returns invalid_request when params are missing', async () => {
    const request = require('supertest');
    const res = await request(createApp())
      .post('/api/auth/oauth/token')
      .type('form')
      .send({ grant_type: GRANT_EMAIL_OTP });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_request');
  });
});

describe('POST /api/auth/oauth/token — refresh grant', () => {
  test('rotates using the cookie and omits user', async () => {
    const authService = require('../../src/services/auth.service');
    const request = require('supertest');
    authService.refresh.mockResolvedValue({ accessToken: 'at2', refreshToken: 'rt2' });

    const res = await request(createApp())
      .post('/api/auth/oauth/token')
      .type('form')
      .send({ grant_type: 'refresh_token' })
      .set('Cookie', 'refreshToken=rt1');

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBe('at2');
    expect(res.body.user).toBeUndefined();
    expect(authService.refresh).toHaveBeenCalledWith('rt1');
  });

  test('accepts refresh_token from the body', async () => {
    const authService = require('../../src/services/auth.service');
    const request = require('supertest');
    authService.refresh.mockResolvedValue({ accessToken: 'at3', refreshToken: 'rt3' });

    const res = await request(createApp())
      .post('/api/auth/oauth/token')
      .type('form')
      .send({ grant_type: 'refresh_token', refresh_token: 'body-rt' });

    expect(res.status).toBe(200);
    expect(authService.refresh).toHaveBeenCalledWith('body-rt');
  });

  test('returns invalid_grant for a revoked token', async () => {
    const authService = require('../../src/services/auth.service');
    const request = require('supertest');
    const err = new Error('Invalid refresh token');
    err.statusCode = 401;
    authService.refresh.mockRejectedValue(err);

    const res = await request(createApp())
      .post('/api/auth/oauth/token')
      .type('form')
      .send({ grant_type: 'refresh_token', refresh_token: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_grant');
  });
});

describe('POST /api/auth/oauth/token — unsupported', () => {
  test('returns unsupported_grant_type', async () => {
    const request = require('supertest');
    const res = await request(createApp())
      .post('/api/auth/oauth/token')
      .type('form')
      .send({ grant_type: 'password' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('unsupported_grant_type');
  });
});
