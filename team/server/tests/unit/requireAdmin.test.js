const mockConfig = { adminEmails: ['admin@example.com'] };

jest.mock('../../src/config', () => mockConfig);

const { requireAdmin } = require('../../src/middleware/requireAdmin');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockConfig.adminEmails = ['admin@example.com'];
});

describe('requireAdmin', () => {
  test('returns 403 when adminEmails is empty', () => {
    mockConfig.adminEmails = [];
    const req = { user: { email: 'admin@example.com' } };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when adminEmails is null', () => {
    mockConfig.adminEmails = null;
    const req = { user: { email: 'admin@example.com' } };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when req.user is missing', () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when req.user.email is missing', () => {
    const req = { user: {} };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when email is not in adminEmails', () => {
    const req = { user: { email: 'user@example.com' } };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next() when email is in adminEmails', () => {
    const req = { user: { email: 'admin@example.com' } };
    const res = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
