const logger = require('../utils/logger');

function buildMeta(requestId, err) {
  const meta = { request_id: requestId };
  if (err._meta) {
    Object.assign(meta, err._meta);
  }
  return meta;
}

function errorHandler(err, req, res, next) {
  const requestId = req.requestId || 'unknown';

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Validation failed', details: err.errors },
      meta: buildMeta(requestId, err),
    });
  }

  if (err.code === 'AI_OUTPUT_INVALID') {
    return res.status(422).json({
      success: false,
      error: { code: 'AI_OUTPUT_INVALID', message: err.message },
      meta: buildMeta(requestId, err),
    });
  }

  if (err.code === 'AI_TIMEOUT') {
    return res.status(504).json({
      success: false,
      error: { code: 'AI_TIMEOUT', message: err.message },
      meta: buildMeta(requestId, err),
    });
  }

  if (err.code === 'AI_UNAVAILABLE') {
    return res.status(503).json({
      success: false,
      error: { code: 'AI_UNAVAILABLE', message: err.message },
      meta: buildMeta(requestId, err),
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'Resource already exists' },
      meta: buildMeta(requestId, err),
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_REFERENCE', message: 'Referenced resource not found' },
      meta: buildMeta(requestId, err),
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Autentikasi diperlukan' },
      meta: buildMeta(requestId, err),
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'Token sudah expired. Silakan login ulang.' },
      meta: buildMeta(requestId, err),
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  logger.error({
    request_id: requestId,
    error_type: err.name,
    error_message: err.message,
    route: req.originalUrl,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
    },
    meta: buildMeta(requestId, err),
  });
}

module.exports = { errorHandler };
