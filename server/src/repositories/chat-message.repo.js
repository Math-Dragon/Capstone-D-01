const db = require('../db');

async function create({ user_id, role, content, plan_snapshot_summary, session_type, session_id }, client) {
  const result = await db.query(
    `INSERT INTO chat_messages (user_id, role, content, plan_snapshot_summary, session_type, session_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [user_id, role, content, plan_snapshot_summary || null, session_type || null, session_id || null],
    client
  );
  return result.rows[0];
}

async function findRecentByUser(userId, limit = 6, client) {
  const result = await db.query(
    'SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit],
    client
  );
  return result.rows.reverse();
}

async function findByUser(userId, { offset = 0, limit = 50 } = {}, client) {
  const result = await db.query(
    'SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3',
    [userId, limit, offset],
    client
  );
  return result.rows;
}

module.exports = { create, findRecentByUser, findByUser };
