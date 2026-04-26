const db = require('../db');

async function list(userId, { status } = {}, client) {
  let sql = 'SELECT * FROM goals WHERE user_id = $1';
  const params = [userId];
  if (status) {
    sql += ' AND status = $2';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  const result = await db.query(sql, params, client);
  return result.rows;
}

async function findById(goalId, client) {
  const result = await db.query('SELECT * FROM goals WHERE id = $1', [goalId], client);
  return result.rows[0] || null;
}

async function findByIdAndUserId(goalId, userId, client) {
  const result = await db.query(
    'SELECT * FROM goals WHERE id = $1 AND user_id = $2',
    [goalId, userId],
    client
  );
  return result.rows[0] || null;
}

async function create({ user_id, title, description, deadline, status }, client) {
  const result = await db.query(
    `INSERT INTO goals (user_id, title, description, deadline, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [user_id, title, description || null, deadline || null, status || 'active'],
    client
  );
  return result.rows[0];
}

async function update(goalId, userId, data, client) {
  const allowed = ['title', 'description', 'deadline', 'status'];
  const sets = [];
  const vals = [];
  let i = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      vals.push(data[key]);
    }
  }
  if (sets.length === 0) return findByIdAndUserId(goalId, userId, client);

  vals.push(goalId);
  const result = await db.query(
    `UPDATE goals SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals,
    client
  );
  return result.rows[0];
}

async function remove(goalId, client) {
  const result = await db.query('DELETE FROM goals WHERE id = $1 RETURNING id', [goalId], client);
  return result.rowCount > 0;
}

module.exports = { list, findById, findByIdAndUserId, create, update, remove };
