const db = require('../db');

async function findByEmail(email, client) {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email], client);
  return result.rows[0] || null;
}

async function findById(id, client) {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id], client);
  return result.rows[0] || null;
}

async function create({ email, password_hash }, client) {
  const result = await db.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *',
    [email, password_hash],
    client
  );
  return result.rows[0];
}

module.exports = { findByEmail, findById, create };
