const { pool } = require('../src/db');

beforeAll(async () => {
  if (process.env.SKIP_DB_CHECK === 'true') return;

  if (!global.__poolEnded) {
    await pool.query('SELECT 1');
  }
});

afterAll(async () => {
  if (process.env.SKIP_DB_CHECK === 'true') return;

  if (!global.__poolEnded) {
    global.__poolEnded = true;
    await pool.end();
  }
});
