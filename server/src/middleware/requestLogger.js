const { randomUUID } = require('crypto');
const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  req.requestId = randomUUID();
  const start = Date.now();

  res.on('finish', () => {
    logger.info({
      request_id: req.requestId,
      method: req.method,
      route: req.originalUrl,
      status_code: res.statusCode,
      duration_ms: Date.now() - start,
      user_id: req.user?.id || null,
    });
  });

  next();
}

module.exports = { requestLogger };
