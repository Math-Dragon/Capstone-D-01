jest.mock('../../src/repositories', () => ({
  user: {
    findByEmail: jest.fn(),
    findByPhoneE164: jest.fn(),
    updatePasswordHash: jest.fn(),
    updatePhoneVerified: jest.fn(),
  },
  profile: { create: jest.fn(), findByUserId: jest.fn() },
  refreshToken: { create: jest.fn(), findByTokenHash: jest.fn(), revokeByTokenHash: jest.fn(), revokeAllForUser: jest.fn() },
  otpChallenge: {
    invalidatePending: jest.fn(),
    create: jest.fn(),
    findLatestPending: jest.fn(),
    findLatestCreated: jest.fn(),
    incrementAttempt: jest.fn(),
    lock: jest.fn(),
    consume: jest.fn(),
  },
  passwordResetSession: {
    create: jest.fn(),
    findByTokenHash: jest.fn(),
    consume: jest.fn(),
  },
}));

jest.mock('../../src/db', () => ({
  withTransaction: jest.fn((fn) => fn({ query: jest.fn() })),
  pool: { query: jest.fn() },
  query: jest.fn(),
}));

jest.mock('../../src/services/notification.service', () => ({
  sendPasswordResetOtp: jest.fn().mockResolvedValue({ devFallback: true }),
  sendPhoneVerifyOtp: jest.fn().mockResolvedValue({ devFallback: true }),
}));

const repos = require('../../src/repositories');
const notificationService = require('../../src/services/notification.service');
const authService = require('../../src/services/auth.service');

describe('password reset service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repos.otpChallenge.findLatestCreated.mockResolvedValue(null);
  });

  test('requestPasswordReset returns generic message for unknown email', async () => {
    repos.user.findByEmail.mockResolvedValue(null);

    const result = await authService.requestPasswordReset('unknown@test.com', 'email');

    expect(result.message).toMatch(/Jika data akun cocok/);
    expect(repos.otpChallenge.create).not.toHaveBeenCalled();
    expect(notificationService.sendPasswordResetOtp).not.toHaveBeenCalled();
  });

  test('requestPasswordReset skips google-only user', async () => {
    repos.user.findByEmail.mockResolvedValue({ id: 'u1', email: 'g@test.com', password_hash: null });

    const result = await authService.requestPasswordReset('g@test.com', 'email');

    expect(result.message).toMatch(/Jika data akun cocok/);
    expect(repos.otpChallenge.create).not.toHaveBeenCalled();
  });

  test('requestPasswordReset sends OTP for eligible email user', async () => {
    repos.user.findByEmail.mockResolvedValue({ id: 'u1', email: 'user@test.com', password_hash: 'hash' });
    repos.otpChallenge.create.mockResolvedValue({ id: 'c1' });

    const result = await authService.requestPasswordReset('user@test.com', 'email');

    expect(result.message).toMatch(/Jika data akun cocok/);
    expect(repos.otpChallenge.invalidatePending).toHaveBeenCalled();
    expect(repos.otpChallenge.create).toHaveBeenCalled();
    expect(notificationService.sendPasswordResetOtp).toHaveBeenCalled();
  });

  test('verifyPasswordResetOtp rejects invalid OTP', async () => {
    repos.otpChallenge.findLatestPending.mockResolvedValue({
      id: 'c1', otp_hash: 'abc', attempt_count: 0, user_id: 'u1',
    });
    repos.otpChallenge.incrementAttempt.mockResolvedValue({ attempt_count: 1 });

    await expect(
      authService.verifyPasswordResetOtp('user@test.com', 'email', '000000'),
    ).rejects.toThrow('Kode OTP tidak valid');
  });

  test('resetPassword revokes refresh tokens in transaction', async () => {
    repos.passwordResetSession.findByTokenHash.mockResolvedValue({ id: 's1', user_id: 'u1' });
    repos.passwordResetSession.consume.mockResolvedValue({ id: 's1', user_id: 'u1' });
    repos.user.updatePasswordHash.mockResolvedValue({});
    repos.refreshToken.revokeAllForUser.mockResolvedValue(1);

    const result = await authService.resetPassword('token123', 'NewPass123');

    expect(result.message).toMatch(/Password berhasil diperbarui/);
    expect(repos.refreshToken.revokeAllForUser).toHaveBeenCalledWith('u1', expect.anything());
  });
});
