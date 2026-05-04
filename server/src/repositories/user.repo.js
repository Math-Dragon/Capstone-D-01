const db = require('../db');

async function findByEmail(email, client) {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email], client);
  return result.rows[0] || null;
}

async function findById(id, client) {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id], client);
  return result.rows[0] || null;
}

async function findByGoogleId(googleId, client) {
  const result = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId], client);
  return result.rows[0] || null;
}

async function findByGithubId(githubId, client) {
  const result = await db.query('SELECT * FROM users WHERE github_id = $1', [githubId], client);
  return result.rows[0] || null;
}

async function updateGoogleId(userId, googleId, client) {
  const result = await db.query(
    'UPDATE users SET google_id = $1 WHERE id = $2 RETURNING *',
    [googleId, userId],
    client
  );
  return result.rows[0];
}

async function create({ email, password_hash, google_id = null, github_id = null }, client) {
  const result = await db.query(
    'INSERT INTO users (email, password_hash, google_id, github_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [email, password_hash, google_id, github_id],
    client
  );
  return result.rows[0];
}

module.exports = { findByEmail, findById, findByGoogleId, findByGithubId, updateGoogleId, create };
