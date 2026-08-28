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

async function findByPhoneE164(phone, client) {
  const result = await db.query('SELECT * FROM users WHERE phone_number = $1', [phone], client);
  return result.rows[0] || null;
}

async function updateGoogleId(userId, googleId, client) {
  const result = await db.query(
    'UPDATE users SET google_id = $1 WHERE id = $2 RETURNING *',
    [googleId, userId],
    client,
  );
  return result.rows[0];
}

async function create({ email, password_hash, google_id = null, github_id = null }, client) {
  const result = await db.query(
    'INSERT INTO users (email, password_hash, google_id, github_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [email, password_hash, google_id, github_id],
    client,
  );
  return result.rows[0];
}

async function updatePasswordHash(userId, passwordHash, client) {
  const result = await db.query(
    'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *',
    [passwordHash, userId],
    client,
  );
  return result.rows[0];
}

async function updatePhoneVerified(userId, phoneNumber, client) {
  const result = await db.query(
    'UPDATE users SET phone_number = $1, phone_verified_at = NOW() WHERE id = $2 RETURNING *',
    [phoneNumber, userId],
    client,
  );
  return result.rows[0];
}

module.exports = {
  findByEmail,
  findById,
  findByGoogleId,
  findByPhoneE164,
  updateGoogleId,
  create,
  updatePasswordHash,
  updatePhoneVerified,
};
