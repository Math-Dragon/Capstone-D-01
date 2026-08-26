const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const repos = require('../repositories');
const admin = require('../config/firebase');
const logger = require('../utils/logger');
const notificationService = require('./notification.service');
const {
  hashOtp,
  hashIdentifier,
  hashToken: hashOpaqueToken,
  generateOtp,
  generateResetToken,
  normalizeEmail,
  normalizePhoneE164,
  maskPhone,
} = require('../utils/otp');

const GENERIC_RESET_MSG = 'Jika data akun cocok, kode reset password akan dikirim.';
const GENERIC_OTP_ERROR = 'Kode OTP tidak valid atau sudah kedaluwarsa.';


function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshExpiryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

class AuthService {
  async register({ email, password, timezone, preferred_time, weekly_target_hours }) {
    const existing = await repos.user.findByEmail(email);
    if (existing) {
      const err = new Error('Email already registered');
      err.statusCode = 409;
      err.code = 'CONFLICT';
      throw err;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const user = await db.withTransaction(async (client) => {
      const u = await repos.user.create({ email, password_hash }, client);
      await repos.profile.create({
        user_id: u.id,
        timezone: timezone || 'Asia/Jakarta',
        preferred_time: preferred_time || 'morning',
        weekly_target_hours: weekly_target_hours || 5.0,
        availability: {},
      }, client);
      return u;
    });

    return { id: user.id, email: user.email };
  }

  async login({ email, password }) {
    const user = await repos.user.findByEmail(email);
    if (!user) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const err = new Error('Invalid credentials');
      err.statusCode = 401;
      throw err;
    }

    const profile = await repos.profile.findByUserId(user.id);

    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtAccessExpiry }
    );
    const refreshToken = jwt.sign(
      { id: user.id, jti: crypto.randomUUID() },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiry }
    );

    await repos.refreshToken.create({
      user_id: user.id,
      token_hash: hashToken(refreshToken),
      expires_at: refreshExpiryDate(),
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, profile, isAdmin: config.adminEmails.includes(user.email) },
    };
  }

  async googleLogin(idToken) {
    if (!admin.apps || !admin.apps.length) {
      const err = new Error('Firebase not configured');
      err.statusCode = 500;
      throw err;
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email } = decoded;

    // 2. Find or create user
    let user = await repos.user.findByGoogleId(uid);
    if (!user && email) {
      user = await repos.user.findByEmail(email);
      if (user) {
        // Link existing email account to Google
        await repos.user.updateGoogleId(user.id, uid);
        user.google_id = uid;
      }
    }
    if (!user) {
      user = await db.withTransaction(async (client) => {
        const u = await repos.user.create({
          email: email || `google_${uid}@placeholder.com`,
          password_hash: null,
          google_id: uid,
        }, client);
        if (!email) {
          logger.warn({ userId: u.id }, 'User created with placeholder email — account merging may be needed');
        }
        await repos.profile.create({
          user_id: u.id,
          timezone: 'Asia/Jakarta',
          preferred_time: 'morning',
          weekly_target_hours: 5.0,
          availability: {},
        }, client);
        return u;
      });
    }

    // 3. Generate JWT
    const profile = await repos.profile.findByUserId(user.id);
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtAccessExpiry }
    );
    const refreshToken = jwt.sign(
      { id: user.id, jti: crypto.randomUUID() },
      config.jwtRefreshSecret,
      { expiresIn: config.jwtRefreshExpiry }
    );

    await repos.refreshToken.create({
      user_id: user.id,
      token_hash: hashToken(refreshToken),
      expires_at: refreshExpiryDate(),
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, profile, isAdmin: config.adminEmails.includes(user.email) },
    };
  }

  async refresh(refreshToken) {
    if (!refreshToken || typeof refreshToken !== 'string') {
      const err = new Error('Invalid refresh token');
      err.statusCode = 401;
      throw err;
    }

    try {
      jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch {
      const err = new Error('Invalid refresh token');
      err.statusCode = 401;
      throw err;
    }

    return db.withTransaction(async (client) => {
      const stored = await repos.refreshToken.findByTokenHash(
        hashToken(refreshToken),
        client,
        { forUpdate: true }
      );
      if (!stored) {
        const err = new Error('Refresh token revoked or expired');
        err.statusCode = 401;
        throw err;
      }

      const revoked = await repos.refreshToken.revokeByTokenHash(
        hashToken(refreshToken),
        client
      );
      if (!revoked) {
        const err = new Error('Refresh token already revoked');
        err.statusCode = 401;
        throw err;
      }

      const accessToken = jwt.sign(
        { id: stored.user_id, email: stored.email },
        config.jwtSecret,
        { expiresIn: config.jwtAccessExpiry }
      );
      const newRefreshToken = jwt.sign(
        { id: stored.user_id, jti: crypto.randomUUID() },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpiry }
      );

      await repos.refreshToken.create({
        user_id: stored.user_id,
        token_hash: hashToken(newRefreshToken),
        expires_at: refreshExpiryDate(),
      }, client);

      return { accessToken, refreshToken: newRefreshToken };
    });
  }

  _otpExpiryDate() {
    const d = new Date();
    d.setMinutes(d.getMinutes() + config.passwordResetOtpTtlMinutes);
    return d;
  }

  _resetSessionExpiryDate() {
    const d = new Date();
    d.setMinutes(d.getMinutes() + config.passwordResetSessionTtlMinutes);
    return d;
  }

  _logAuthEvent(event, meta = {}) {
    logger.info({ event, ...meta }, event);
  }

  async _resolvePasswordResetUser(identifier, channel) {
    if (channel === 'email') {
      const email = normalizeEmail(identifier);
      return { user: await repos.user.findByEmail(email), normalized: email };
    }
    const phone = normalizePhoneE164(identifier);
    return { user: await repos.user.findByPhoneE164(phone), normalized: phone };
  }

  _isEligibleForPasswordReset(user, channel) {
    if (!user || !user.password_hash) return false;
    if (channel === 'sms') {
      return Boolean(user.phone_verified_at && user.phone_number);
    }
    return true;
  }

  async _assertCooldown(identifierHash, purpose, channel) {
    const latest = await repos.otpChallenge.findLatestCreated({ identifierHash, purpose, channel });
    if (!latest) return;
    const elapsedMs = Date.now() - new Date(latest.created_at).getTime();
    if (elapsedMs < config.passwordResetOtpCooldownSeconds * 1000) {
      const err = new Error('Terlalu banyak permintaan. Coba lagi nanti.');
      err.statusCode = 429;
      err.code = 'RATE_LIMITED';
      throw err;
    }
  }

  async _createOtpChallengeAndNotify({
    user, identifier, identifierHash, channel, purpose, userId, sendFn,
  }) {
    await repos.otpChallenge.invalidatePending({
      identifierHash, purpose, channel, userId,
    });

    const otp = generateOtp();
    const challenge = await repos.otpChallenge.create({
      user_id: userId || user?.id || null,
      purpose,
      identifier,
      identifier_hash: identifierHash,
      channel,
      otp_hash: hashOtp(otp),
      expires_at: this._otpExpiryDate(),
    });

    await sendFn(otp);

    this._logAuthEvent(
      purpose === 'password_reset' ? 'AUTH_PASSWORD_RESET_REQUESTED' : 'AUTH_PHONE_VERIFY_REQUESTED',
      { identifier_hash: identifierHash, channel, purpose },
    );

    return challenge;
  }

  async requestPasswordReset(identifier, channel, context = {}) {
    const { user, normalized } = await this._resolvePasswordResetUser(identifier, channel);
    const identifierHash = hashIdentifier(`${channel}:${normalized}`);
    const generic = { message: GENERIC_RESET_MSG };

    if (!this._isEligibleForPasswordReset(user, channel)) {
      this._logAuthEvent('AUTH_PASSWORD_RESET_REQUESTED', {
        identifier_hash: identifierHash,
        channel,
        reason: 'skipped_ineligible',
        ip: context.ip,
      });
      return generic;
    }

    await this._assertCooldown(identifierHash, 'password_reset', channel);

    await this._createOtpChallengeAndNotify({
      user,
      identifier: normalized,
      identifierHash,
      channel,
      purpose: 'password_reset',
      userId: user.id,
      sendFn: (otp) => notificationService.sendPasswordResetOtp({
        channel,
        to: normalized,
        otp,
        expiresInMinutes: config.passwordResetOtpTtlMinutes,
      }),
    });

    return generic;
  }

  async verifyPasswordResetOtp(identifier, channel, otp, context = {}) {
    const { normalized } = await this._resolvePasswordResetUser(identifier, channel);
    const identifierHash = hashIdentifier(`${channel}:${normalized}`);
    const challenge = await repos.otpChallenge.findLatestPending({
      identifierHash, purpose: 'password_reset', channel,
    });

    if (!challenge) {
      this._logAuthEvent('AUTH_PASSWORD_RESET_FAILED', {
        identifier_hash: identifierHash, channel, reason: 'not_found', ip: context.ip,
      });
      const err = new Error(GENERIC_OTP_ERROR);
      err.statusCode = 400;
      err.code = 'INVALID_OTP';
      throw err;
    }

    if (challenge.attempt_count >= config.passwordResetMaxAttempts) {
      await repos.otpChallenge.lock(challenge.id);
      const err = new Error(GENERIC_OTP_ERROR);
      err.statusCode = 400;
      err.code = 'INVALID_OTP';
      throw err;
    }

    if (hashOtp(otp) !== challenge.otp_hash) {
      const updated = await repos.otpChallenge.incrementAttempt(challenge.id);
      if (updated.attempt_count >= config.passwordResetMaxAttempts) {
        await repos.otpChallenge.lock(challenge.id);
      }
      this._logAuthEvent('AUTH_PASSWORD_RESET_FAILED', {
        identifier_hash: identifierHash, channel, reason: 'invalid_otp', ip: context.ip,
      });
      const err = new Error(GENERIC_OTP_ERROR);
      err.statusCode = 400;
      err.code = 'INVALID_OTP';
      throw err;
    }

    const consumed = await repos.otpChallenge.consume(challenge.id);
    if (!consumed) {
      const err = new Error(GENERIC_OTP_ERROR);
      err.statusCode = 400;
      err.code = 'INVALID_OTP';
      throw err;
    }

    const resetToken = generateResetToken();
    await repos.passwordResetSession.create({
      user_id: consumed.user_id,
      otp_challenge_id: consumed.id,
      token_hash: hashOpaqueToken(resetToken),
      expires_at: this._resetSessionExpiryDate(),
    });

    this._logAuthEvent('AUTH_PASSWORD_RESET_OTP_VERIFIED', {
      identifier_hash: identifierHash, channel, ip: context.ip,
    });

    return {
      resetToken,
      expiresInMinutes: config.passwordResetSessionTtlMinutes,
    };
  }

  async resetPassword(resetToken, newPassword, context = {}) {
    return db.withTransaction(async (client) => {
      const session = await repos.passwordResetSession.findByTokenHash(
        hashOpaqueToken(resetToken),
        client,
        { forUpdate: true },
      );

      if (!session) {
        const err = new Error('Token reset password tidak valid atau sudah kedaluwarsa.');
        err.statusCode = 400;
        err.code = 'INVALID_RESET_TOKEN';
        throw err;
      }

      const consumed = await repos.passwordResetSession.consume(session.id, client);
      if (!consumed) {
        const err = new Error('Token reset password tidak valid atau sudah kedaluwarsa.');
        err.statusCode = 400;
        err.code = 'INVALID_RESET_TOKEN';
        throw err;
      }

      const password_hash = await bcrypt.hash(newPassword, 12);
      await repos.user.updatePasswordHash(session.user_id, password_hash, client);
      await repos.refreshToken.revokeAllForUser(session.user_id, client);

      this._logAuthEvent('AUTH_PASSWORD_RESET_COMPLETED', {
        user_id: session.user_id, ip: context.ip,
      });

      return { message: 'Password berhasil diperbarui. Silakan login kembali.' };
    });
  }

  async requestPhoneVerification(userId, phoneNumber, context = {}) {
    const phone = normalizePhoneE164(phoneNumber);
    const identifierHash = hashIdentifier(`sms:${phone}`);

    const existing = await repos.user.findByPhoneE164(phone);
    if (existing && existing.id !== userId && existing.phone_verified_at) {
      const err = new Error('Nomor telepon sudah digunakan akun lain.');
      err.statusCode = 409;
      err.code = 'CONFLICT';
      throw err;
    }

    await this._assertCooldown(identifierHash, 'phone_verify', 'sms');

    await this._createOtpChallengeAndNotify({
      user: { id: userId },
      identifier: phone,
      identifierHash,
      channel: 'sms',
      purpose: 'phone_verify',
      userId,
      sendFn: (otp) => notificationService.sendPhoneVerifyOtp({
        to: phone,
        otp,
        expiresInMinutes: config.passwordResetOtpTtlMinutes,
      }),
    });

    return { message: 'Kode verifikasi telah dikirim ke nomor telepon kamu.' };
  }

  async verifyPhone(userId, phoneNumber, otp, context = {}) {
    const phone = normalizePhoneE164(phoneNumber);
    const identifierHash = hashIdentifier(`sms:${phone}`);
    const challenge = await repos.otpChallenge.findLatestPending({
      identifierHash, purpose: 'phone_verify', channel: 'sms',
    });

    if (!challenge || challenge.user_id !== userId) {
      const err = new Error(GENERIC_OTP_ERROR);
      err.statusCode = 400;
      err.code = 'INVALID_OTP';
      throw err;
    }

    if (challenge.attempt_count >= config.passwordResetMaxAttempts) {
      await repos.otpChallenge.lock(challenge.id);
      const err = new Error(GENERIC_OTP_ERROR);
      err.statusCode = 400;
      err.code = 'INVALID_OTP';
      throw err;
    }

    if (hashOtp(otp) !== challenge.otp_hash) {
      const updated = await repos.otpChallenge.incrementAttempt(challenge.id);
      if (updated.attempt_count >= config.passwordResetMaxAttempts) {
        await repos.otpChallenge.lock(challenge.id);
      }
      const err = new Error(GENERIC_OTP_ERROR);
      err.statusCode = 400;
      err.code = 'INVALID_OTP';
      throw err;
    }

    const existing = await repos.user.findByPhoneE164(phone);
    if (existing && existing.id !== userId && existing.phone_verified_at) {
      const err = new Error('Nomor telepon sudah digunakan akun lain.');
      err.statusCode = 409;
      err.code = 'CONFLICT';
      throw err;
    }

    await repos.otpChallenge.consume(challenge.id);
    await repos.user.updatePhoneVerified(userId, phone);

    this._logAuthEvent('AUTH_PHONE_VERIFY_VERIFIED', { user_id: userId, ip: context.ip });

    return {
      phoneNumber: maskPhone(phone),
      phoneVerified: true,
    };
  }

  formatUserAuthProfile(user, profile) {
    return {
      id: user.id,
      email: user.email,
      profile,
      isAdmin: config.adminEmails.includes(user.email),
      phoneNumber: user.phone_number ? maskPhone(user.phone_number) : null,
      phoneVerified: Boolean(user.phone_verified_at),
    };
  }

  async logout(userId, refreshToken) {
    if (refreshToken) {
      await repos.refreshToken.revokeByTokenHash(hashToken(refreshToken));
    } else {
      await repos.refreshToken.revokeAllForUser(userId);
    }
  }
}

module.exports = new AuthService();
