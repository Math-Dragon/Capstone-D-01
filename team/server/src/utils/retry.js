const logger = require('./logger');

const TRANSIENT_PG_CODES = new Set([
  '40001',
  '40P01',
  '57P03',
  '08003',
  '08006',
  '57P01',
  '57P02',
  'E3Q8',
]);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, opts = {}) {
  const { maxAttempts = 3, delayMs = 200, maxDelayMs = 5000, shouldRetry, label = 'operation' } = opts;

  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      const retryable = shouldRetry ? shouldRetry(err) : true;
      if (!retryable || attempt === maxAttempts) {
        throw err;
      }

      const jitter = Math.random() * delayMs;
      const backoff = Math.min(delayMs * Math.pow(2, attempt - 1) + jitter, maxDelayMs);
      logger.warn({
        label,
        attempt,
        maxAttempts,
        err: err.message,
        code: err.code || undefined,
        retry_in_ms: Math.round(backoff),
      }, 'Retrying after transient error');
      await sleep(backoff);
    }
  }
  throw lastErr;
}

function isTransientPgError(err) {
  return TRANSIENT_PG_CODES.has(err.code);
}

module.exports = { withRetry, isTransientPgError, TRANSIENT_PG_CODES };
