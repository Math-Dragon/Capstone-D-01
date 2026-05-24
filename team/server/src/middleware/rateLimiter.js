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

module.exports = { authLimiter, aiLimiter, generalLimiter };
