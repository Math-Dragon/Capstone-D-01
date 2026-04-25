const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  const requestId = req.requestId || 'unknown';

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.errors[0]?.message || 'Validation failed', details: err.errors },
      meta: { request_id: requestId },
    });
  }

  if (err.code === 'AI_OUTPUT_INVALID') {
    return res.status(422).json({
      success: false,
      error: { code: 'AI_OUTPUT_INVALID', message: err.message },
      meta: { request_id: requestId },
    });
  }

  if (err.code === 'AI_TIMEOUT') {
    return res.status(504).json({
      success: false,
      error: { code: 'AI_TIMEOUT', message: err.message },
      meta: { request_id: requestId },
    });
  }

  if (err.code === 'AI_UNAVAILABLE') {
    return res.status(503).json({
      success: false,
      error: { code: 'AI_UNAVAILABLE', message: err.message },
      meta: { request_id: requestId },
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: 'Resource already exists' },
      meta: { request_id: requestId },
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_REFERENCE', message: 'Referenced resource not found' },
      meta: { request_id: requestId },
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  logger.error({ request_id: requestId, err: err.message, stack: err.stack });

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
    },
    meta: { request_id: requestId },
  });
}

module.exports = { errorHandler };
