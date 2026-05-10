const db = require('../db');

async function findByIdAndUserId(id, userId, client) {
  const lock = client ? ' FOR UPDATE' : '';
  const result = await db.query(
    `SELECT * FROM ai_recommendations WHERE id = $1 AND user_id = $2${lock}`,
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

async function updateOutput(id, output, client) {
  const result = await db.query(
    'UPDATE ai_recommendations SET output = $1 WHERE id = $2 RETURNING *',
    [output, id],
    client
  );
  return result.rows[0];
}

async function computeAllMetrics() {
  const result = await db.query(`
    SELECT
      COALESCE(SUM(jsonb_array_length(output->'tasks')), 0)::int AS suggested,
      COALESCE(SUM((SELECT COUNT(*) FROM jsonb_array_elements(output->'tasks') AS t WHERE t->>'status' = 'accepted')), 0)::int AS accepted,
      COALESCE(SUM((SELECT COUNT(*) FROM jsonb_array_elements(output->'tasks') AS t WHERE t->>'status' = 'rejected')), 0)::int AS rejected,
      COALESCE(SUM((SELECT COUNT(*) FROM jsonb_array_elements(output->'tasks') AS t WHERE t->>'status' = 'pending')), 0)::int AS pending
    FROM ai_recommendations
  `);
  return result.rows[0] || { suggested: 0, accepted: 0, rejected: 0, pending: 0 };
}

module.exports = { findByIdAndUserId, create, updateStatus, updateOutput, computeAllMetrics };
