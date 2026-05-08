const { pool } = require('../src/db');

beforeAll(async () => {
  if (!global.__poolEnded) {
    await pool.query('SELECT 1');
  }
});

afterAll(async () => {
  if (!global.__poolEnded) {
    global.__poolEnded = true;
    await pool.end();
  }
});
