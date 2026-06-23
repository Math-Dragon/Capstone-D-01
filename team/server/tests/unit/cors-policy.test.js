process.env.SKIP_DB_CHECK = 'true';

jest.mock('../../src/middleware/rateLimiter', () => ({
  authLimiter: (_req, _res, next) => next(),
  aiLimiter: (_req, _res, next) => next(),
  generalLimiter: (_req, _res, next) => next(),
}));

const ORIGINAL_ENV = { ...process.env };

describe('CORS policy', () => {
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

  test('rejects disallowed origins with an explicit CORS policy error', async () => {
    const request = require('supertest');
    const app = require('../../src/app');

    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example.com');

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CORS_ORIGIN_DENIED');
  });
});
