const db = require('../db');

async function findByUserAndWeek(userId, week, client) {
  const result = await db.query(
    'SELECT * FROM progress_snapshots WHERE user_id = $1 AND week = $2',
    [userId, week],
    client
  );
  return result.rows[0] || null;
}

async function upsert({ user_id, week, planned_hours, completed_hours, completion_rate }, client) {
  const result = await db.query(
    `INSERT INTO progress_snapshots (user_id, week, planned_hours, completed_hours, completion_rate)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, week)
     DO UPDATE SET planned_hours = EXCLUDED.planned_hours,
                   completed_hours = EXCLUDED.completed_hours,
                   completion_rate = EXCLUDED.completion_rate
     RETURNING *`,
    [user_id, week, planned_hours, completed_hours, completion_rate],
    client
  );
  return result.rows[0];
}

async function listTrend(userId, { from, to, limit = 52, offset = 0 } = {}, client) {
  let sql = 'SELECT * FROM progress_snapshots WHERE user_id = $1';
  const params = [userId];
  let idx = 2;

  if (from) {
    sql += ` AND week >= $${idx++}`;
    params.push(from);
  }
  if (to) {
    sql += ` AND week <= $${idx++}`;
    params.push(to);
  }
  sql += ' ORDER BY week ASC';
  sql += ` LIMIT $${idx++} OFFSET $${idx++}`;
  params.push(limit, offset);

  const result = await db.query(sql, params, client);
  return result.rows;
}

module.exports = { findByUserAndWeek, upsert, listTrend };
