const { pool } = require('../src/db');

beforeAll(async () => {
  if (process.env.SKIP_DB_CHECK === 'true') return;

  if (!global.__poolEnded) {
    await pool.query('SELECT 1');
  }
});

afterAll(async () => {
  if (process.env.CLOSE_DB_AFTER_TESTS !== 'true') return;
  if (process.env.SKIP_DB_CHECK === 'true') return;

  await pool.end();
});
