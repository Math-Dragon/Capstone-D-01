const db = require('../db');

async function create({ user_id, otp_challenge_id, token_hash, expires_at }, client) {
  const result = await db.query(
    `INSERT INTO password_reset_sessions (user_id, otp_challenge_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [user_id, otp_challenge_id, token_hash, expires_at],
    client,
  );
  return result.rows[0];
}

async function findByTokenHash(tokenHash, client, options = {}) {
  const lock = client && options.forUpdate ? ' FOR UPDATE' : '';
  const result = await db.query(
    `SELECT * FROM password_reset_sessions
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()${lock}`,
    [tokenHash],
    client,
  );
  return result.rows[0] || null;
}

async function consume(id, client) {
  const result = await db.query(
    `UPDATE password_reset_sessions
     SET used_at = NOW()
     WHERE id = $1 AND used_at IS NULL
     RETURNING *`,
    [id],
    client,
  );
  return result.rows[0] || null;
}

module.exports = { create, findByTokenHash, consume };
