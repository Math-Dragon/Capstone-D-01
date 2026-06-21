const db = require('../db');

function serializeRationale(value) {
  if (value == null || value === '') return null;
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

async function listByUser(userId, { goalId, status, limit: queryLimit } = {}, client) {
  let sql = 'SELECT t.* FROM tasks t INNER JOIN goals g ON t.goal_id = g.id WHERE g.user_id = $1';
  const params = [userId];
  let idx = 2;

  if (goalId) {
    sql += ` AND t.goal_id = $${idx++}`;
    params.push(goalId);
  }
  if (status) {
    sql += ` AND t.status = $${idx++}`;
    params.push(status);
  }
  sql += ' ORDER BY t.planned_date ASC';
  const limit = queryLimit != null ? parseInt(queryLimit, 10) : 500;
  if (limit > 0) {
    sql += ` LIMIT $${idx++}`;
    params.push(limit);
  }

  const result = await db.query(sql, params, client);
  return result.rows;
}

async function findByGoalIds(goalIds, client) {
  if (goalIds.length === 0) return [];
  const result = await db.query(
    'SELECT * FROM tasks WHERE goal_id = ANY($1) ORDER BY planned_date ASC',
    [goalIds],
    client
  );
  return result.rows;
}

async function findByGoalId(goalId, client) {
  const result = await db.query(
    'SELECT * FROM tasks WHERE goal_id = $1 ORDER BY planned_date ASC',
    [goalId],
    client
  );
  return result.rows;
}

async function findById(taskId, client) {
  const result = await db.query('SELECT * FROM tasks WHERE id = $1', [taskId], client);
  return result.rows[0] || null;
}

async function findByIdAndUser(taskId, userId, client) {
  const result = await db.query(
    `SELECT t.* FROM tasks t INNER JOIN goals g ON t.goal_id = g.id
     WHERE t.id = $1 AND g.user_id = $2`,
    [taskId, userId],
    client
  );
  return result.rows[0] || null;
}

async function findScheduledByUser(userId, client) {
  const result = await db.query(
    `SELECT t.*, g.title AS goal_title
     FROM tasks t
     INNER JOIN goals g ON t.goal_id = g.id
     WHERE g.user_id = $1 AND t.planned_date IS NOT NULL
     ORDER BY t.planned_date ASC, t.planned_slot ASC, t.created_at ASC`,
    [userId],
    client
  );
  return result.rows;
}

async function findByRecommendationId(recommendationId, client) {
  const result = await db.query(
    'SELECT * FROM tasks WHERE recommendation_id = $1 ORDER BY planned_date ASC, created_at ASC',
    [recommendationId],
    client
  );
  return result.rows;
}

async function create(data, client) {
  const result = await db.query(
    `INSERT INTO tasks (goal_id, recommendation_id, title, description, duration_estimate, planned_date,
       planned_slot, status, source, actual_duration, completed_at, rationale, task_type, personal_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'todo'), COALESCE($9, 'manual'), $10, $11, $12, $13, $14)
     RETURNING *`,
    [
      data.goal_id,
      data.recommendation_id || null,
      data.title,
      data.description || null,
      data.duration_estimate,
      data.planned_date || null,
      data.planned_slot || null,
      data.status || null,
      data.source || null,
      data.actual_duration || null,
      data.completed_at || null,
      serializeRationale(data.rationale),
      data.task_type || null,
      data.personal_notes || null,
    ],
    client
  );
  return result.rows[0];
}

async function createMany(tasksArray, client) {
  if (tasksArray.length === 0) return [];

  const cols = [
    'goal_id', 'recommendation_id', 'title', 'description', 'duration_estimate',
    'planned_date', 'planned_slot', 'status', 'source',
    'actual_duration', 'completed_at', 'rationale', 'task_type', 'personal_notes',
  ];
  const values = [];
  const placeholders = [];
  let i = 1;

  for (const t of tasksArray) {
    const row = [
      t.goal_id, t.recommendation_id || null, t.title, t.description || null, t.duration_estimate,
      t.planned_date || null, t.planned_slot || null, t.status || 'todo',
      t.source || 'manual', t.actual_duration || null, t.completed_at || null,
      serializeRationale(t.rationale), t.task_type || null, t.personal_notes || null,
    ];
    placeholders.push(`(${cols.map(() => `$${i++}`).join(', ')})`);
    values.push(...row);
  }

  const sql = `INSERT INTO tasks (${cols.join(', ')}) VALUES ${placeholders.join(', ')} RETURNING *`;
  const result = await db.query(sql, values, client);
  return result.rows;
}

async function update(taskId, data, client) {
  const allowed = [
    'title', 'description', 'duration_estimate', 'planned_date',
    'planned_slot', 'status', 'source', 'actual_duration', 'completed_at', 'rationale',
    'task_type', 'skip_reason', 'feedback_difficulty', 'feedback_focus',
    'feedback_notes', 'feedback_submitted_at', 'personal_notes'
  ];
  const sets = [];
  const vals = [];
  let i = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      vals.push(key === 'rationale' ? serializeRationale(data[key]) : data[key]);
    }
  }
  if (sets.length === 0) return findById(taskId, client);

  sets.push('updated_at = NOW()');
  vals.push(taskId);
  const result = await db.query(
    `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals,
    client
  );
  return result.rows[0];
}

async function remove(taskId, userId, client) {
  const result = await db.query(
    `DELETE FROM tasks t USING goals g
     WHERE t.id = $1 AND t.goal_id = g.id AND g.user_id = $2
     RETURNING t.id`,
    [taskId, userId],
    client
  );
  return result.rowCount > 0;
}

async function findByUserAndWeek(userId, week, client) {
  const result = await db.query(
    `SELECT t.* FROM tasks t
     INNER JOIN goals g ON t.goal_id = g.id
     WHERE g.user_id = $1
       AND TO_CHAR(t.planned_date, 'IYYY"-W"IW') = $2`,
    [userId, week],
    client
  );
  return result.rows;
}

async function findActiveByUser(userId, client) {
  const result = await db.query(
    `SELECT t.* FROM tasks t
     INNER JOIN goals g ON t.goal_id = g.id
     WHERE g.user_id = $1 AND t.status IN ('todo', 'in_progress')
     ORDER BY t.planned_date ASC`,
    [userId],
    client
  );
  return result.rows;
}

async function countByGoalIds(goalIds, client) {
  if (goalIds.length === 0) return {};
  const result = await db.query(
    `SELECT goal_id,
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status IN ('done', 'completed'))::int AS completed
     FROM tasks
     WHERE goal_id = ANY($1)
     GROUP BY goal_id`,
    [goalIds],
    client
  );
  const map = {};
  for (const row of result.rows) {
    map[row.goal_id] = { total: row.total, completed: row.completed };
  }
  return map;
}

module.exports = {
  listByUser, findByGoalIds, findByGoalId, findById,
  findByIdAndUser, findScheduledByUser, findByRecommendationId, create, createMany, update, remove, findByUserAndWeek,
  findActiveByUser, countByGoalIds,
};
