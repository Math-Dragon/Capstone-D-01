const { Pool } = require('pg');
const config = require('./config');
const logger = require('./utils/logger');
const { withRetry, isTransientPgError } = require('./utils/retry');

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const SLOW_QUERY_THRESHOLD_MS = 500;

pool.on('error', (err) => {
  logger.error({ err: err.message }, 'Unexpected idle pool error');
});

async function query(text, params, client) {
  const c = client || pool;
  const start = Date.now();
  const runQuery = () => c.query(text, params);
  const result = client
    ? await runQuery()
    : await withRetry(runQuery, {
    maxAttempts: 2,
    delayMs: 100,
    shouldRetry: isTransientPgError,
    label: 'db.query',
  });

  const durationMs = Date.now() - start;
  if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
    logger.warn({
      event: 'db_slow_query',
      duration_ms: durationMs,
      has_client: !!client,
      query_preview: String(text).replace(/\s+/g, ' ').trim().slice(0, 160),
    }, 'Database query exceeded slow-query threshold');
  }

  return result;
}

async function withTransaction(fn) {
  return withRetry(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }, {
    maxAttempts: 3,
    delayMs: 200,
    shouldRetry: isTransientPgError,
    label: 'db.withTransaction',
  });
}

async function isHealthy() {
  try {
    const result = await pool.query('SELECT 1');
    return result.rowCount === 1;
  } catch {
    return false;
  }
}

module.exports = { pool, query, withTransaction, isHealthy, SLOW_QUERY_THRESHOLD_MS };
