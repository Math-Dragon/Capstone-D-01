const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { redisClient, connectRedis } = require('../services/redis');
const logger = require('../utils/logger');

function makeLimiter(opts) {
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
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
    }),
    keyGenerator: opts.keyGenerator,
    handler: opts.handler,
  });
}

const authLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 5,
  prefix: 'auth',
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many auth attempts' } });
  },
});

const aiLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 20,
  prefix: 'ai',
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many AI requests' } });
  },
});

module.exports = { authLimiter, aiLimiter };
