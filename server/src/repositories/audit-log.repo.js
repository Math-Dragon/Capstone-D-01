const db = require('../db');

async function create({ user_id, recommendation_id, action, metadata, session_id }, client) {
  const result = await db.query(
    `INSERT INTO audit_logs (user_id, recommendation_id, action, metadata, session_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [user_id || null, recommendation_id || null, action, metadata || {}, session_id || null],
    client
  );
  return result.rows[0];
}

async function findByUserId(userId, { limit = 50, offset = 0, action } = {}, client) {
  let sql = 'SELECT * FROM audit_logs WHERE user_id = $1';
  const params = [userId];
  let idx = 2;

  if (action) {
    sql += ` AND action = $${idx++}`;
    params.push(action);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);

  const result = await db.query(sql, params, client);
  return result.rows;
}

async function countByAction(userId, client) {
  const result = await db.query(
    'SELECT action, COUNT(*)::int as count FROM audit_logs WHERE user_id = $1 GROUP BY action ORDER BY count DESC',
    [userId],
    client
  );
  return result.rows.reduce((acc, row) => {
    acc[row.action] = row.count;
    return acc;
  }, {});
}

module.exports = { create, findByUserId, countByAction };
