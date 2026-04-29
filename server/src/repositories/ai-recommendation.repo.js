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

async function updateOutput(id, output, client) {
  const result = await db.query(
    'UPDATE ai_recommendations SET output = $1 WHERE id = $2 RETURNING *',
    [output, id],
    client
  );
  return result.rows[0];
}

async function computeAllMetrics() {
  const result = await db.query('SELECT output FROM ai_recommendations');
  let suggested = 0, accepted = 0, rejected = 0, pending = 0;

  for (const row of result.rows) {
    const tasks = row.output?.tasks || [];
    suggested += tasks.length;
    for (const t of tasks) {
      if (t.status === 'accepted') accepted++;
      else if (t.status === 'rejected') rejected++;
      else pending++;
    }
  }

  return { suggested, accepted, rejected, pending };
}

module.exports = { findByIdAndUserId, create, updateStatus, updateOutput, computeAllMetrics };
