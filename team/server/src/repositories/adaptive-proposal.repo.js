const db = require('../db');
const taskRepo = require('./task.repo');

const PROPOSAL_TYPE = 'adaptive_plan';
const ACTIVE_TASK_STATUSES = ['todo', 'in_progress'];

function jsonb(value) {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

async function findLatestPending(userId, client) {
  const result = await db.query(
    `SELECT * FROM ai_recommendations
      WHERE user_id = $1 AND type = $2 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId, PROPOSAL_TYPE],
    client
  );
  return result.rows[0] || null;
}

async function findPendingForUpdate(userId, client) {
  const result = await db.query(
    `SELECT * FROM ai_recommendations
      WHERE user_id = $1 AND type = $2 AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE`,
    [userId, PROPOSAL_TYPE],
    client
  );
  return result.rows[0] || null;
}

async function findByIdOwned(id, userId, client, options = {}) {
  const lock = client && options.forUpdate ? ' FOR UPDATE' : '';
  const result = await db.query(
    `SELECT * FROM ai_recommendations WHERE id = $1 AND user_id = $2${lock}`,
    [id, userId],
    client
  );
  return result.rows[0] || null;
}

async function findByResolutionKey(userId, key, client) {
  const result = await db.query(
    `SELECT * FROM ai_recommendations
      WHERE user_id = $1 AND resolution_idempotency_key = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId, key],
    client
  );
  return result.rows[0] || null;
}

async function createPending({
  user_id,
  goal_id,
  adaptation_type,
  input_context,
  output,
  evidence_summary,
  plan_diff,
  base_plan_snapshot_id,
  expires_at,
}, client) {
  const result = await db.query(
    `INSERT INTO ai_recommendations
       (user_id, goal_id, type, input_context, output, status,
        adaptation_type, evidence_summary, plan_diff, base_plan_snapshot_id, expires_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      user_id,
      goal_id || null,
      PROPOSAL_TYPE,
      jsonb(input_context || {}),
      jsonb(output || {}),
      adaptation_type || null,
      jsonb(evidence_summary),
      jsonb(plan_diff),
      base_plan_snapshot_id || null,
      expires_at || null,
    ],
    client
  );
  return result.rows[0];
}

async function resolve(id, { status, resolutionIdempotencyKey, resolutionResult, resultPlanSnapshotId }, client) {
  const result = await db.query(
    `UPDATE ai_recommendations
        SET status = $1,
            resolved_at = NOW(),
            updated_at = NOW(),
            resolution_idempotency_key = $2,
            resolution_result = $3,
            result_plan_snapshot_id = $4
      WHERE id = $5
      RETURNING *`,
    [
      status,
      resolutionIdempotencyKey || null,
      jsonb(resolutionResult),
      resultPlanSnapshotId || null,
      id,
    ],
    client
  );
  return result.rows[0] || null;
}

// Reuses task.repo (goal-scoped list) instead of duplicating the active-task SQL
// that findActiveByUser already owns; filtering happens on the status allowlist.
async function findActiveTasksByGoal(userId, goalId, client) {
  if (!goalId) return [];
  const tasks = await taskRepo.listByUser(userId, { goalId }, client);
  return tasks.filter((task) => ACTIVE_TASK_STATUSES.includes(task.status));
}

module.exports = {
  findLatestPending,
  findPendingForUpdate,
  findByIdOwned,
  findByResolutionKey,
  createPending,
  resolve,
  findActiveTasksByGoal,
};
