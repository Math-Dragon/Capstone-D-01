process.env.SKIP_DB_CHECK = 'true';

jest.mock('../../src/repositories', () => ({
  user: { findByEmail: jest.fn(), findById: jest.fn() },
  profile: { findByUserId: jest.fn() },
  refreshToken: { create: jest.fn() },
  otpChallenge: {
    invalidatePending: jest.fn(),
    create: jest.fn(),
    findLatestPending: jest.fn(),
    findLatestCreated: jest.fn(),
    incrementAttempt: jest.fn(),
    lock: jest.fn(),
    consume: jest.fn(),
  },
}));

jest.mock('../../src/db', () => ({
  withTransaction: jest.fn((fn) => fn({ query: jest.fn() })),
  pool: { query: jest.fn() },
  query: jest.fn(),
}));

jest.mock('../../src/services/notification.service', () => ({
  sendLoginOtp: jest.fn().mockResolvedValue({ devFallback: true }),
  sendPasswordResetOtp: jest.fn().mockResolvedValue({ devFallback: true }),
  sendPhoneVerifyOtp: jest.fn().mockResolvedValue({ devFallback: true }),
}));

const repos = require('../../src/repositories');
const notificationService = require('../../src/services/notification.service');
const authService = require('../../src/services/auth.service');
const { hashOtp } = require('../../src/utils/otp');

describe('login OTP service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repos.otpChallenge.findLatestCreated.mockResolvedValue(null);
  });

  test('returns generic message for unknown email', async () => {
    repos.user.findByEmail.mockResolvedValue(null);

    const result = await authService.requestLoginOtp('unknown@test.com');

    expect(result.message).toMatch(/Jika data akun cocok/);
    expect(repos.otpChallenge.create).not.toHaveBeenCalled();
    expect(notificationService.sendLoginOtp).not.toHaveBeenCalled();
  });

  test('skips accounts with placeholder email', async () => {
    repos.user.findByEmail.mockResolvedValue({ id: 'u1', email: 'google_abc@placeholder.com' });

    const result = await authService.requestLoginOtp('google_abc@placeholder.com');

    expect(result.message).toMatch(/Jika data akun cocok/);
    expect(notificationService.sendLoginOtp).not.toHaveBeenCalled();
  });

  test('sends OTP for an existing user', async () => {
    repos.user.findByEmail.mockResolvedValue({ id: 'u1', email: 'user@test.com' });
    repos.otpChallenge.create.mockResolvedValue({ id: 'c1' });

    const result = await authService.requestLoginOtp('user@test.com');

    expect(result.message).toMatch(/Jika data akun cocok/);
    expect(repos.otpChallenge.invalidatePending).toHaveBeenCalled();
    expect(repos.otpChallenge.create).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'login', channel: 'email' }),
    );
    expect(notificationService.sendLoginOtp).toHaveBeenCalled();
  });

  test('enforces resend cooldown', async () => {
    repos.user.findByEmail.mockResolvedValue({ id: 'u1', email: 'user@test.com' });
    repos.otpChallenge.findLatestCreated.mockResolvedValue({ created_at: new Date().toISOString() });

    await expect(authService.requestLoginOtp('user@test.com')).rejects.toThrow(/Terlalu banyak/);
    expect(notificationService.sendLoginOtp).not.toHaveBeenCalled();
  });

  test('rejects an invalid OTP', async () => {
    repos.otpChallenge.findLatestPending.mockResolvedValue({
      id: 'c1', otp_hash: 'abc', attempt_count: 0, user_id: 'u1',
    });
    repos.otpChallenge.incrementAttempt.mockResolvedValue({ attempt_count: 1 });

    await expect(authService.verifyLoginOtp('user@test.com', '000000'))
      .rejects.toThrow('Kode OTP tidak valid');
  });

  test('returns generic error when no challenge exists', async () => {
    repos.otpChallenge.findLatestPending.mockResolvedValue(null);

    await expect(authService.verifyLoginOtp('user@test.com', '123456'))
      .rejects.toThrow('Kode OTP tidak valid');
  });

  test('issues a session on valid OTP', async () => {
    const challenge = { id: 'c1', attempt_count: 0, user_id: 'u1', otp_hash: hashOtp('123456') };
    repos.otpChallenge.findLatestPending.mockResolvedValue(challenge);
    repos.otpChallenge.consume.mockResolvedValue(challenge);
    repos.user.findById.mockResolvedValue({ id: 'u1', email: 'user@test.com' });
    repos.profile.findByUserId.mockResolvedValue({ timezone: 'Asia/Jakarta' });
    repos.refreshToken.create.mockResolvedValue({});

    const result = await authService.verifyLoginOtp('user@test.com', '123456');

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user).toEqual(expect.objectContaining({ id: 'u1', email: 'user@test.com' }));
    expect(repos.otpChallenge.consume).toHaveBeenCalledWith('c1');
    expect(repos.refreshToken.create).toHaveBeenCalled();
  });

  test('locks the challenge after max attempts', async () => {
    repos.otpChallenge.findLatestPending.mockResolvedValue({
      id: 'c1', otp_hash: hashOtp('111111'), attempt_count: 4, user_id: 'u1',
    });
    repos.otpChallenge.incrementAttempt.mockResolvedValue({ attempt_count: 5 });

    await expect(authService.verifyLoginOtp('user@test.com', '000000'))
      .rejects.toThrow('Kode OTP tidak valid');
    expect(repos.otpChallenge.lock).toHaveBeenCalledWith('c1');
  });
});
