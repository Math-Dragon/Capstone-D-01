function metricsAuth(req, res, next) {
  const config = require('../config');
  if (!config.metricsApiKey) return next();

  const key = req.headers['x-metrics-key'];
  if (key !== config.metricsApiKey) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Invalid metrics key' } });
  }
  next();
}

module.exports = { metricsAuth };
