process.env.SKIP_DB_CHECK = 'true';

const ORIGINAL_ENV = { ...process.env };

describe('production config', () => {
  afterEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  test('uses explicit production origins and cross-site cookie settings', () => {
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

    const config = require('../../src/config');

    expect(config.allowedOrigins).toEqual(['https://stepup-app.vercel.app']);
    expect(config.refreshCookieOptions.sameSite).toBe('none');
    expect(config.refreshCookieOptions.secure).toBe(true);
  });

  test('requires explicit allowed origins in production', () => {
    jest.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      SKIP_DB_CHECK: 'true',
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: '',
      DATABASE_URL: 'postgres://example',
      JWT_SECRET: '12345678901234567890123456789012',
      JWT_REFRESH_SECRET: '12345678901234567890123456789012',
      LLM_PROVIDER: 'mock',
    };

    expect(() => require('../../src/config')).toThrow('Missing required env: ALLOWED_ORIGINS');
  });

  test('production gemini provider requires api key', () => {
    jest.resetModules();
    process.env = {
      ...ORIGINAL_ENV,
      SKIP_DB_CHECK: 'true',
      NODE_ENV: 'production',
      ALLOWED_ORIGINS: 'https://stepup-app.vercel.app',
      DATABASE_URL: 'postgres://example',
      JWT_SECRET: '12345678901234567890123456789012',
      JWT_REFRESH_SECRET: '12345678901234567890123456789012',
      LLM_PROVIDER: 'gemini',
      GEMINI_API_KEY: '',
    };

    expect(() => require('../../src/config')).toThrow('Missing required env: GEMINI_API_KEY');
  });
});
