const db = require('../db');

async function create({ user_id, trigger_id, adaptation_type, tasks_snapshot, plan_summary }, client) {
  const result = await db.query(
    `INSERT INTO plan_snapshots (user_id, trigger_id, adaptation_type, tasks_snapshot, plan_summary)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [user_id, trigger_id, adaptation_type, JSON.stringify(tasks_snapshot), plan_summary || null],
    client
  );
  return result.rows[0];
}

async function findLatest(userId, client) {
  const result = await db.query(
    'SELECT * FROM plan_snapshots WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [userId],
    client
  );
  return result.rows[0] || null;
}

async function remove(snapshotId, client) {
  const result = await db.query(
    'DELETE FROM plan_snapshots WHERE id = $1 RETURNING id',
    [snapshotId],
    client
  );
  return result.rowCount > 0;
}

module.exports = { create, findLatest, remove };
