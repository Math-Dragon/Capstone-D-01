const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const repos = require('../repositories');

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
      user: { id: user.id, email: user.email, profile },
    };
  }

  async googleLogin(idToken) {
    // 1. Verify Firebase ID token
    const admin = require('../config/firebase');
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
      user: { id: user.id, email: user.email, profile },
    };
  }

  async refresh(refreshToken) {
    try {
      jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch {
      const err = new Error('Invalid refresh token');
      err.statusCode = 401;
      throw err;
    }

    const stored = await repos.refreshToken.findByTokenHash(hashToken(refreshToken));
    if (!stored) {
      const err = new Error('Refresh token revoked or expired');
      err.statusCode = 401;
      throw err;
    }

    await repos.refreshToken.revokeByTokenHash(hashToken(refreshToken));

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
    });

    return { accessToken, refreshToken: newRefreshToken };
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
