const db = require('../db');

async function listByUser(userId, { goalId, status } = {}, client) {
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

async function create(data, client) {
  const result = await db.query(
    `INSERT INTO tasks (goal_id, title, description, duration_estimate, planned_date,
       planned_slot, status, source, actual_duration, completed_at, rationale, task_type)
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'todo'), COALESCE($8, 'manual'), $9, $10, $11, $12)
     RETURNING *`,
    [
      data.goal_id,
      data.title,
      data.description || null,
      data.duration_estimate,
      data.planned_date || null,
      data.planned_slot || null,
      data.status || null,
      data.source || null,
      data.actual_duration || null,
      data.completed_at || null,
      data.rationale || null,
      data.task_type || null,
    ],
    client
  );
  return result.rows[0];
}

async function createMany(tasksArray, client) {
  if (tasksArray.length === 0) return [];

  const cols = [
    'goal_id', 'title', 'description', 'duration_estimate',
    'planned_date', 'planned_slot', 'status', 'source',
    'actual_duration', 'completed_at', 'rationale', 'task_type',
  ];
  const values = [];
  const placeholders = [];
  let i = 1;

  for (const t of tasksArray) {
    const row = [
      t.goal_id, t.title, t.description || null, t.duration_estimate,
      t.planned_date || null, t.planned_slot || null, t.status || 'todo',
      t.source || 'manual', t.actual_duration || null, t.completed_at || null,
      t.rationale || null, t.task_type || null,
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
    'feedback_notes', 'feedback_submitted_at'
  ];
  const sets = [];
  const vals = [];
  let i = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      vals.push(data[key]);
    }
  }
  if (sets.length === 0) return findById(taskId, client);

  vals.push(taskId);
  const result = await db.query(
    `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals,
    client
  );
  return result.rows[0];
}

async function remove(taskId, client) {
  const result = await db.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [taskId], client);
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

module.exports = {
  listByUser, findByGoalIds, findByGoalId, findById,
  findByIdAndUser, create, createMany, update, remove, findByUserAndWeek,
};
