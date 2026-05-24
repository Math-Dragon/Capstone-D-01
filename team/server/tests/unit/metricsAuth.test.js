function mockRes() {
  return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
}

describe('metricsAuth middleware', () => {
  test('calls next when no metricsApiKey configured', () => {
    jest.doMock('../../src/config', () => ({ metricsApiKey: '' }));
    const { metricsAuth } = require('../../src/middleware/metricsAuth');
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    metricsAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    jest.resetModules();
  });

  test('returns 403 when key does not match', () => {
    jest.doMock('../../src/config', () => ({ metricsApiKey: 'secret' }));
    const { metricsAuth } = require('../../src/middleware/metricsAuth');
    const req = { headers: { 'x-metrics-key': 'wrong-key' } };
    const res = mockRes();
    const next = jest.fn();
    metricsAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    jest.resetModules();
  });

  test('calls next when key matches', () => {
    jest.doMock('../../src/config', () => ({ metricsApiKey: 'secret' }));
    const { metricsAuth } = require('../../src/middleware/metricsAuth');
    const req = { headers: { 'x-metrics-key': 'secret' } };
    const res = mockRes();
    const next = jest.fn();
    metricsAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    jest.resetModules();
  });
});
