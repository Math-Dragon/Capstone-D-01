const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient, connectRedis } = require('../services/redis');
const logger = require('../utils/logger');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60 * 1000;
const authMax = parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 5;
const aiMax = parseInt(process.env.AI_RATE_LIMIT_MAX, 10) || 20;

function makeLimiter(opts) {
  const limiterOptions = {
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: opts.keyGenerator,
    handler: opts.handler,
  };

  if (process.env.NODE_ENV !== 'test') {
    limiterOptions.store = new RedisStore({
      sendCommand: async (...args) => {
        try {
          await connectRedis();
          return await redisClient.sendCommand(args);
        } catch (err) {
          // If Redis is down, we might want to fail open or log
          logger.error({ err: err.message }, 'Redis Rate Limiter Error');
          throw err;
        }
      },
      prefix: `rl:${opts.prefix}:`,
    });
  }

  return rateLimit(limiterOptions);
}

function getRetryAfterSeconds(req) {
  const resetTime = req.rateLimit?.resetTime;
  if (!resetTime) return 60;

  const resetMs = resetTime instanceof Date ? resetTime.getTime() : new Date(resetTime).getTime();
  if (!Number.isFinite(resetMs)) return 60;

  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

const authLimiter = makeLimiter({
  windowMs,
  max: authMax,
  prefix: 'auth',
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    const retryAfterSeconds = getRetryAfterSeconds(req);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many auth attempts, please try again in ${retryAfterSeconds} seconds`,
        retryAfterSeconds,
      },
    });
  },
});

const aiLimiter = makeLimiter({
  windowMs,
  max: aiMax,
  prefix: 'ai',
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    const retryAfterSeconds = getRetryAfterSeconds(req);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many AI requests, please try again in ${retryAfterSeconds} seconds`,
        retryAfterSeconds,
      },
    });
  },
});

const generalMax = parseInt(process.env.GENERAL_RATE_LIMIT_MAX, 10) || 60;

const generalLimiter = makeLimiter({
  windowMs,
  max: generalMax,
  prefix: 'general',
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    const retryAfterSeconds = getRetryAfterSeconds(req);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many requests, please try again in ${retryAfterSeconds} seconds`,
        retryAfterSeconds,
      },
    });
  },
});


const forgotPasswordMax = parseInt(process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX, 10) || 5;
const verifyOtpMax = parseInt(process.env.VERIFY_OTP_RATE_LIMIT_MAX, 10) || 10;
const resetPasswordMax = parseInt(process.env.RESET_PASSWORD_RATE_LIMIT_MAX, 10) || 5;
const phoneVerifyMax = parseInt(process.env.PHONE_VERIFY_RATE_LIMIT_MAX, 10) || 3;
const otpWindowMs = 15 * 60 * 1000;

const forgotPasswordLimiter = makeLimiter({
  windowMs: otpWindowMs,
  max: forgotPasswordMax,
  prefix: 'forgot-password',
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    const retryAfterSeconds = getRetryAfterSeconds(req);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many password reset requests, please try again in ${retryAfterSeconds} seconds`,
        retryAfterSeconds,
      },
    });
  },
});

const verifyOtpLimiter = makeLimiter({
  windowMs: otpWindowMs,
  max: verifyOtpMax,
  prefix: 'verify-otp',
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    const retryAfterSeconds = getRetryAfterSeconds(req);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many OTP verification attempts, please try again in ${retryAfterSeconds} seconds`,
        retryAfterSeconds,
      },
    });
  },
});

const resetPasswordLimiter = makeLimiter({
  windowMs: otpWindowMs,
  max: resetPasswordMax,
  prefix: 'reset-password',
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    const retryAfterSeconds = getRetryAfterSeconds(req);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many reset password attempts, please try again in ${retryAfterSeconds} seconds`,
        retryAfterSeconds,
      },
    });
  },
});

const phoneVerifyLimiter = makeLimiter({
  windowMs: otpWindowMs,
  max: phoneVerifyMax,
  prefix: 'phone-verify',
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    const retryAfterSeconds = getRetryAfterSeconds(req);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many phone verification requests, please try again in ${retryAfterSeconds} seconds`,
        retryAfterSeconds,
      },
    });
  },
});

const loginOtpMax = parseInt(process.env.LOGIN_OTP_RATE_LIMIT_MAX, 10) || 5;
const oauthTokenMax = parseInt(process.env.OAUTH_TOKEN_RATE_LIMIT_MAX, 10) || 30;

const loginOtpLimiter = makeLimiter({
  windowMs: otpWindowMs,
  max: loginOtpMax,
  prefix: 'login-otp',
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    const retryAfterSeconds = getRetryAfterSeconds(req);
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: `Too many login code requests, please try again in ${retryAfterSeconds} seconds`,
        retryAfterSeconds,
      },
    });
  },
});

const oauthTokenLimiter = makeLimiter({
  windowMs: otpWindowMs,
  max: oauthTokenMax,
  prefix: 'oauth-token',
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    const retryAfterSeconds = getRetryAfterSeconds(req);
    res.locals.skipEnrich = true;
    res.status(429).json({
      error: 'temporarily_unavailable',
      error_description: `Too many token requests, please try again in ${retryAfterSeconds} seconds`,
    });
  },
});

module.exports = {
  authLimiter,
  aiLimiter,
  generalLimiter,
  forgotPasswordLimiter,
  verifyOtpLimiter,
  resetPasswordLimiter,
  phoneVerifyLimiter,
  loginOtpLimiter,
  oauthTokenLimiter,
};
