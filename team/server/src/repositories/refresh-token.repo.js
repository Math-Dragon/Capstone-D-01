const db = require('../db');

async function create({ user_id, token_hash, expires_at }, client) {
  const result = await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3) RETURNING *`,
    [user_id, token_hash, expires_at],
    client
  );
  return result.rows[0];
}

async function findByTokenHash(tokenHash, client, options = {}) {
  const lock = client && options.forUpdate ? ' FOR UPDATE' : '';
  const result = await db.query(
    `SELECT rt.*, u.email FROM refresh_tokens rt
     INNER JOIN users u ON rt.user_id = u.id
     WHERE rt.token_hash = $1 AND rt.expires_at > NOW()${lock}`,
    [tokenHash],
    client
  );
  return result.rows[0] || null;
}

async function revokeByTokenHash(tokenHash, client) {
  const result = await db.query(
    'DELETE FROM refresh_tokens WHERE token_hash = $1 RETURNING id',
    [tokenHash],
    client
  );
  return result.rowCount > 0;
}

async function revokeAllForUser(userId, client) {
  const result = await db.query(
    'DELETE FROM refresh_tokens WHERE user_id = $1 RETURNING id',
    [userId],
    client
  );
  return result.rowCount;
}

async function cleanExpired(client) {
  const result = await db.query(
    'DELETE FROM refresh_tokens WHERE expires_at <= NOW() RETURNING id',
    [],
    client
  );
  return result.rowCount;
}

module.exports = { create, findByTokenHash, revokeByTokenHash, revokeAllForUser, cleanExpired };
