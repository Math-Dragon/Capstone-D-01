const db = require('../db');

async function create({ user_id, trigger_id, adaptation_type, tasks_snapshot, plan_summary, goal_id, snapshot_kind }, client) {
  const result = await db.query(
    `INSERT INTO plan_snapshots (user_id, trigger_id, adaptation_type, tasks_snapshot, plan_summary, goal_id, snapshot_kind)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'undo')) RETURNING *`,
    [user_id, trigger_id, adaptation_type, JSON.stringify(tasks_snapshot), plan_summary || null, goal_id || null, snapshot_kind || null],
    client
  );
  return result.rows[0];
}

async function findLatest(userId, client) {
  // Undo only ever restores/deletes undo snapshots: base/result snapshots are
  // immutable references held by adaptive proposals.
  const result = await db.query(
    `SELECT * FROM plan_snapshots
      WHERE user_id = $1 AND snapshot_kind = 'undo'
      ORDER BY created_at DESC
      LIMIT 1`,
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
