const db = require('../db');

async function create({ user_id, recommendation_id, action, metadata }, client) {
  const result = await db.query(
    `INSERT INTO audit_logs (user_id, recommendation_id, action, metadata)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [user_id || null, recommendation_id || null, action, metadata || {}],
    client
  );
  return result.rows[0];
}

module.exports = { create };
