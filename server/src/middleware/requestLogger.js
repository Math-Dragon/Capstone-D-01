const { randomUUID } = require('crypto');
const logger = require('../utils/logger');
const { httpRequestCount, httpLatency } = require('../utils/metrics');

function requestLogger(req, res, next) {
  req.requestId = randomUUID();
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const route = req.route ? (req.baseUrl || '') + (req.route.path || '') : req.path;

    httpRequestCount.inc({ method: req.method, route, status_code: res.statusCode });
    httpLatency.observe({ method: req.method, route }, durationMs / 1000);

    logger.info({
      request_id: req.requestId,
      method: req.method,
      route,
      status_code: res.statusCode,
      duration_ms: durationMs,
      user_id: req.user?.id || null,
    });
  });

  next();
}

module.exports = { requestLogger };
