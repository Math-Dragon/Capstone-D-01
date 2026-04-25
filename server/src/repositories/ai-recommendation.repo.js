const db = require('../db');

async function findByIdAndUserId(id, userId, client) {
  const result = await db.query(
    'SELECT * FROM ai_recommendations WHERE id = $1 AND user_id = $2',
    [id, userId],
    client
  );
  return result.rows[0] || null;
}

async function create({ user_id, goal_id, type, input_context, output, status }, client) {
  const result = await db.query(
    `INSERT INTO ai_recommendations (user_id, goal_id, type, input_context, output, status)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'pending')) RETURNING *`,
    [user_id, goal_id || null, type, input_context, output, status || null],
    client
  );
  return result.rows[0];
}

async function updateStatus(id, status, client) {
  const result = await db.query(
    'UPDATE ai_recommendations SET status = $1 WHERE id = $2 RETURNING *',
    [status, id],
    client
  );
  return result.rows[0];
}

module.exports = { findByIdAndUserId, create, updateStatus };
