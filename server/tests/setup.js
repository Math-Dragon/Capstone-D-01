const { pool } = require('../src/db');

beforeAll(async () => {
  await pool.query('SELECT 1');
});

afterAll(async () => {
  await pool.end();
});
