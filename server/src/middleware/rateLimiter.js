const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many auth attempts' } });
  },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  handler: (req, res) => {
    res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many AI requests' } });
  },
});

module.exports = { authLimiter, aiLimiter };
