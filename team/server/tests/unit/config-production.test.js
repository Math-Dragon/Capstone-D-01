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
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit:${code}`);
    });

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

    expect(() => require('../../src/config')).toThrow('process.exit:1');
    expect(stderrSpy).toHaveBeenCalledWith('Missing required env: ALLOWED_ORIGINS\n');

    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
