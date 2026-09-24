process.env.SKIP_DB_CHECK = 'true';

const express = require('express');
const request = require('supertest');

function buildApp(configMock) {
  jest.resetModules();
  jest.doMock('../../src/config', () => configMock);
  const { phoneVerifyGate } = require('../../src/middleware/phoneVerifyGate');

  const app = express();
  app.use((req, _res, next) => {
    req.user = { email: 'user@test.com' };
    next();
  });
  app.use('/gated', phoneVerifyGate, (_req, res) => res.json({ success: true, data: { ok: true } }));
  return app;
}

describe('phoneVerifyGate', () => {
  test('returns 404 when disabled', async () => {
    const app = buildApp({ phoneVerifyEnabled: false, phoneVerifyWhitelist: [] });
    const res = await request(app).post('/gated');
    expect(res.status).toBe(404);
  });

  test('passes when enabled with no whitelist', async () => {
    const app = buildApp({ phoneVerifyEnabled: true, phoneVerifyWhitelist: [] });
    const res = await request(app).post('/gated');
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
  });

  test('returns 404 when whitelist excludes the user', async () => {
    const app = buildApp({ phoneVerifyEnabled: true, phoneVerifyWhitelist: ['other@test.com'] });
    const res = await request(app).post('/gated');
    expect(res.status).toBe(404);
  });

  test('passes when the user is whitelisted', async () => {
    const app = buildApp({ phoneVerifyEnabled: true, phoneVerifyWhitelist: ['user@test.com'] });
    const res = await request(app).post('/gated');
    expect(res.status).toBe(200);
  });
});
