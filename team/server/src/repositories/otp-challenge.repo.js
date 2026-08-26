const db = require('../db');

async function invalidatePending({ identifierHash, purpose, channel, userId }, client) {
  const params = [identifierHash, purpose, channel];
  let sql = `UPDATE otp_challenges
     SET status = 'expired', updated_at = NOW()
     WHERE identifier_hash = $1 AND purpose = $2 AND channel = $3 AND status = 'pending'`;
  if (userId) {
    params.push(userId);
    sql += ` AND user_id = $${params.length}`;
  }
  await db.query(sql, params, client);
}

async function create({
  user_id, purpose, identifier, identifier_hash, channel, otp_hash, expires_at,
}, client) {
  const result = await db.query(
    `INSERT INTO otp_challenges
      (user_id, purpose, identifier, identifier_hash, channel, otp_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [user_id || null, purpose, identifier, identifier_hash, channel, otp_hash, expires_at],
    client,
  );
  return result.rows[0];
}

async function findLatestPending({ identifierHash, purpose, channel }, client) {
  const result = await db.query(
    `SELECT * FROM otp_challenges
     WHERE identifier_hash = $1 AND purpose = $2 AND channel = $3 AND status = 'pending'
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [identifierHash, purpose, channel],
    client,
  );
  return result.rows[0] || null;
}

async function findLatestCreated({ identifierHash, purpose, channel }, client) {
  const result = await db.query(
    `SELECT * FROM otp_challenges
     WHERE identifier_hash = $1 AND purpose = $2 AND channel = $3
     ORDER BY created_at DESC
     LIMIT 1`,
    [identifierHash, purpose, channel],
    client,
  );
  return result.rows[0] || null;
}

async function incrementAttempt(id, client) {
  const result = await db.query(
    `UPDATE otp_challenges
     SET attempt_count = attempt_count + 1, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id],
    client,
  );
  return result.rows[0];
}

async function lock(id, client) {
  const result = await db.query(
    `UPDATE otp_challenges
     SET status = 'locked', updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id],
    client,
  );
  return result.rows[0];
}

async function consume(id, client) {
  const result = await db.query(
    `UPDATE otp_challenges
     SET status = 'consumed', consumed_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [id],
    client,
  );
  return result.rows[0] || null;
}

module.exports = {
  invalidatePending,
  create,
  findLatestPending,
  findLatestCreated,
  incrementAttempt,
  lock,
  consume,
};
