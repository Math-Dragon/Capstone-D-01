const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../../src/repositories', () => ({
  user: { findByEmail: jest.fn(), create: jest.fn(), findByGoogleId: jest.fn(), updateGoogleId: jest.fn() },
  profile: { create: jest.fn(), findByUserId: jest.fn() },
  refreshToken: { create: jest.fn(), findByTokenHash: jest.fn(), revokeByTokenHash: jest.fn(), revokeAllForUser: jest.fn() },
}));

jest.mock('../../src/db', () => ({
  withTransaction: jest.fn((fn) => fn({ query: jest.fn() })),
  pool: { query: jest.fn() },
  query: jest.fn(),
}));

jest.mock('../../src/config/firebase', () => {
  const verifyIdToken = jest.fn();
  return {
    apps: [{ name: '[DEFAULT]' }],
    auth: jest.fn(() => ({ verifyIdToken })),
  };
});

const repos = require('../../src/repositories');
const db = require('../../src/db');
const authService = require('../../src/services/auth.service');

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    test('registers a new user successfully', async () => {
      repos.user.findByEmail.mockResolvedValue(null);
      repos.user.create.mockResolvedValue({ id: 'uuid-1', email: 'test@example.com' });
      repos.profile.create.mockResolvedValue({});

      const result = await authService.register({
        email: 'test@example.com',
        password: 'SecurePass1',
      });

      expect(repos.user.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(repos.user.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'uuid-1', email: 'test@example.com' });
    });

    test('throws error for duplicate email', async () => {
      repos.user.findByEmail.mockResolvedValue({ id: 'existing', email: 'test@example.com' });

      await expect(authService.register({
        email: 'test@example.com',
        password: 'SecurePass1',
      })).rejects.toThrow('Email already registered');

      expect(repos.user.create).not.toHaveBeenCalled();
    });

    test('passes optional fields to profile', async () => {
      repos.user.findByEmail.mockResolvedValue(null);
      repos.user.create.mockResolvedValue({ id: 'uuid-1', email: 'test@example.com' });
      repos.profile.create.mockResolvedValue({});

      await authService.register({
        email: 'test@example.com',
        password: 'SecurePass1',
        timezone: 'Asia/Jakarta',
        preferred_time: 'evening',
        weekly_target_hours: 10,
      });

      expect(repos.profile.create).toHaveBeenCalledWith(expect.objectContaining({
        timezone: 'Asia/Jakarta',
        preferred_time: 'evening',
        weekly_target_hours: 10,
      }), expect.anything());
    });
  });

  describe('login', () => {
    test('returns tokens for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('SecurePass1', 12);
      repos.user.findByEmail.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        password_hash: hashedPassword,
      });
      repos.profile.findByUserId.mockResolvedValue({ timezone: 'Asia/Jakarta' });
      repos.refreshToken.create.mockResolvedValue({});

      const result = await authService.login({
        email: 'test@example.com',
        password: 'SecurePass1',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@example.com');

      const decoded = jwt.verify(result.accessToken, process.env.JWT_SECRET);
      expect(decoded.id).toBe('uuid-1');
    });

    test('throws error for non-existent email', async () => {
      repos.user.findByEmail.mockResolvedValue(null);

      await expect(authService.login({
        email: 'nonexistent@example.com',
        password: 'SecurePass1',
      })).rejects.toThrow('Invalid credentials');
    });

    test('throws error for wrong password', async () => {
      const hashedPassword = await bcrypt.hash('RealPass1', 12);
      repos.user.findByEmail.mockResolvedValue({
        id: 'uuid-1',
        email: 'test@example.com',
        password_hash: hashedPassword,
      });

      await expect(authService.login({
        email: 'test@example.com',
        password: 'WrongPass1',
      })).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    test('returns new tokens for valid refresh token', async () => {
      const refreshToken = jwt.sign(
        { id: 'uuid-1', jti: 'jti-1' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      repos.refreshToken.findByTokenHash.mockResolvedValue({
        user_id: 'uuid-1',
        email: 'test@example.com',
      });
      repos.refreshToken.revokeByTokenHash.mockResolvedValue();
      repos.refreshToken.create.mockResolvedValue({});

      const result = await authService.refresh(refreshToken);
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    test('throws error for invalid token string', async () => {
      await expect(authService.refresh('')).rejects.toThrow('Invalid refresh token');
    });

    test('throws error for revoked token', async () => {
      const refreshToken = jwt.sign(
        { id: 'uuid-1', jti: 'jti-1' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      repos.refreshToken.findByTokenHash.mockResolvedValue(null);

      await expect(authService.refresh(refreshToken)).rejects.toThrow('Refresh token revoked or expired');
    });
  });

  describe('logout', () => {
    test('revokes specific token when refreshToken provided', async () => {
      repos.refreshToken.revokeByTokenHash.mockResolvedValue();
      await authService.logout('uuid-1', 'some-token');
      expect(repos.refreshToken.revokeByTokenHash).toHaveBeenCalled();
    });

    test('revokes all tokens when no refreshToken', async () => {
      repos.refreshToken.revokeAllForUser.mockResolvedValue();
      await authService.logout('uuid-1', null);
      expect(repos.refreshToken.revokeAllForUser).toHaveBeenCalledWith('uuid-1');
    });
  });

  describe('googleLogin', () => {
    const admin = require('../../src/config/firebase');

    test('throws when Firebase not configured', async () => {
      const originalApps = admin.apps;
      Object.defineProperty(admin, 'apps', { value: [], configurable: true });
      await expect(authService.googleLogin('token'))
        .rejects.toMatchObject({ statusCode: 500 });
      Object.defineProperty(admin, 'apps', { value: originalApps, configurable: true });
    });

    test('returns tokens for existing user by googleId', async () => {
      admin.auth().verifyIdToken.mockResolvedValue({ uid: 'gid1', email: 'a@b.com' });
      repos.user.findByGoogleId.mockResolvedValue({ id: 'u1', email: 'a@b.com', google_id: 'gid1' });
      repos.profile.findByUserId.mockResolvedValue({ timezone: 'Asia/Jakarta' });
      repos.refreshToken.create.mockResolvedValue({});

      const result = await authService.googleLogin('token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('a@b.com');
    });

    test('links existing email account to Google', async () => {
      admin.auth().verifyIdToken.mockResolvedValue({ uid: 'gid2', email: 'linked@b.com' });
      repos.user.findByGoogleId.mockResolvedValue(null);
      repos.user.findByEmail.mockResolvedValue({ id: 'u2', email: 'linked@b.com' });
      repos.user.updateGoogleId.mockResolvedValue({ id: 'u2', google_id: 'gid2' });
      repos.profile.findByUserId.mockResolvedValue({});
      repos.refreshToken.create.mockResolvedValue({});

      const result = await authService.googleLogin('token');
      expect(repos.user.updateGoogleId).toHaveBeenCalledWith('u2', 'gid2');
      expect(result).toHaveProperty('accessToken');
    });

    test('creates new user when not found', async () => {
      admin.auth().verifyIdToken.mockResolvedValue({ uid: 'gid3', email: 'new@b.com' });
      repos.user.findByGoogleId.mockResolvedValue(null);
      repos.user.findByEmail.mockResolvedValue(null);
      repos.user.create.mockResolvedValue({ id: 'u3', email: 'new@b.com' });
      repos.profile.create.mockResolvedValue({});
      repos.profile.findByUserId.mockResolvedValue({});
      repos.refreshToken.create.mockResolvedValue({});

      const result = await authService.googleLogin('token');
      expect(repos.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ google_id: 'gid3', email: 'new@b.com' }),
        expect.anything(),
      );
      expect(result).toHaveProperty('accessToken');
    });

    test('creates user with placeholder email when no email from token', async () => {
      admin.auth().verifyIdToken.mockResolvedValue({ uid: 'gid4', email: undefined });
      repos.user.findByGoogleId.mockResolvedValue(null);
      repos.user.create.mockResolvedValue({ id: 'u4', email: 'google_gid4@placeholder.com' });
      repos.profile.create.mockResolvedValue({});
      repos.profile.findByUserId.mockResolvedValue({});
      repos.refreshToken.create.mockResolvedValue({});

      const result = await authService.googleLogin('token');
      expect(repos.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'google_gid4@placeholder.com' }),
        expect.anything(),
      );
      expect(result).toHaveProperty('accessToken');
    });
  });
});
