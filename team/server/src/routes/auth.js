const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const config = require('../config');
const repos = require('../repositories');
const { authenticate } = require('../middleware/authenticate');
const { phoneVerifyGate } = require('../middleware/phoneVerifyGate');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../models/user.model');
const {
  requestPasswordResetSchema,
  requestLoginOtpSchema,
  verifyPasswordResetOtpSchema,
  resetPasswordSchema,
  requestPhoneVerifySchema,
  verifyPhoneSchema,
} = require('../models/password-reset.model');
const {
  forgotPasswordLimiter,
  verifyOtpLimiter,
  resetPasswordLimiter,
  phoneVerifyLimiter,
  loginOtpLimiter,
} = require('../middleware/rateLimiter');

function requestContext(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

router.post('/register', validate({ body: registerSchema }), async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.post('/login', validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.cookie('refreshToken', result.refreshToken, config.refreshCookieOptions);
    res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) { next(err); }
});

router.post('/google', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      const err = new Error('idToken is required');
      err.statusCode = 400;
      throw err;
    }
    const result = await authService.googleLogin(idToken);
    res.cookie('refreshToken', result.refreshToken, config.refreshCookieOptions);
    res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      const err = new Error('No refresh token');
      err.statusCode = 401;
      throw err;
    }
    const result = await authService.refresh(refreshToken);
    res.cookie('refreshToken', result.refreshToken, config.refreshCookieOptions);
    res.json({ success: true, data: { accessToken: result.accessToken } });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await repos.user.findById(req.user.id);
    const profile = await repos.profile.findByUserId(req.user.id);
    res.json({
      success: true,
      data: authService.formatUserAuthProfile(user, profile),
    });
  } catch (err) { next(err); }
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await authService.logout(req.user.id, req.cookies.refreshToken);
    res.clearCookie('refreshToken');
    res.json({ success: true, data: { message: 'Logged out' } });
  } catch (err) { next(err); }
});

router.post(
  '/passwordless/start',
  loginOtpLimiter,
  validate({ body: requestLoginOtpSchema }),
  async (req, res, next) => {
    try {
      const data = await authService.requestLoginOtp(req.body.email, requestContext(req));
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
);

router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate({ body: requestPasswordResetSchema }),
  async (req, res, next) => {
    try {
      const data = await authService.requestPasswordReset(
        req.body.identifier,
        req.body.channel,
        requestContext(req),
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
);

router.post(
  '/forgot-password/verify-otp',
  verifyOtpLimiter,
  validate({ body: verifyPasswordResetOtpSchema }),
  async (req, res, next) => {
    try {
      const data = await authService.verifyPasswordResetOtp(
        req.body.identifier,
        req.body.channel,
        req.body.otp,
        requestContext(req),
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
);

router.post(
  '/reset-password',
  resetPasswordLimiter,
  validate({ body: resetPasswordSchema }),
  async (req, res, next) => {
    try {
      const data = await authService.resetPassword(
        req.body.resetToken,
        req.body.password,
        requestContext(req),
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
);

router.post(
  '/phone/request-verify',
  authenticate,
  phoneVerifyGate,
  phoneVerifyLimiter,
  validate({ body: requestPhoneVerifySchema }),
  async (req, res, next) => {
    try {
      const data = await authService.requestPhoneVerification(
        req.user.id,
        req.body.phoneNumber,
        requestContext(req),
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
);

router.post(
  '/phone/verify',
  authenticate,
  phoneVerifyGate,
  verifyOtpLimiter,
  validate({ body: verifyPhoneSchema }),
  async (req, res, next) => {
    try {
      const data = await authService.verifyPhone(
        req.user.id,
        req.body.phoneNumber,
        req.body.otp,
        requestContext(req),
      );
      res.json({ success: true, data });
    } catch (err) { next(err); }
  },
);

module.exports = router;
