const db = require('../db');

async function create(data, client) {
  const inserted = await db.query(
    `INSERT INTO check_in_events
      (user_id, client_event_id, event_type, mood, note, source, client_timestamp, app_version, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, client_event_id) DO NOTHING
     RETURNING *`,
    [data.user_id, data.client_event_id, data.event_type, data.mood || null, data.note || null,
      data.source, data.client_timestamp || null, data.app_version || null, data.metadata || {}],
    client
  );
  if (inserted.rows[0]) return { event: inserted.rows[0], replayed: false };

  const existing = await db.query(
    'SELECT * FROM check_in_events WHERE user_id = $1 AND client_event_id = $2',
    [data.user_id, data.client_event_id], client
  );
  return { event: existing.rows[0], replayed: true };
}

async function findOwnedById(userId, id, client) {
  const result = await db.query(
    `SELECT e.*,
      CASE WHEN tg.user_id = e.user_id THEN jsonb_build_object('id', t.id, 'title', t.title) ELSE NULL END AS linked_task,
      CASE WHEN COALESCE(g.user_id, tg.user_id) = e.user_id
        THEN jsonb_build_object('id', COALESCE(g.id, tg.id), 'title', COALESCE(g.title, tg.title)) ELSE NULL END AS linked_goal
     FROM check_in_events e
     LEFT JOIN tasks t ON t.id::text = e.metadata->>'task_id'
     LEFT JOIN goals tg ON tg.id = t.goal_id
     LEFT JOIN goals g ON g.id::text = e.metadata->>'goal_id'
     WHERE e.user_id = $1 AND e.id = $2`,
    [userId, id], client
  );
  return result.rows[0] || null;
}

async function listByUser(userId, { filter, limit, cursor }, client) {
  const params = [userId];
  let sql = `SELECT e.*,
    CASE WHEN tg.user_id = e.user_id THEN jsonb_build_object('id', t.id, 'title', t.title) ELSE NULL END AS linked_task,
    CASE WHEN COALESCE(g.user_id, tg.user_id) = e.user_id
      THEN jsonb_build_object('id', COALESCE(g.id, tg.id), 'title', COALESCE(g.title, tg.title)) ELSE NULL END AS linked_goal
    FROM check_in_events e
    LEFT JOIN tasks t ON t.id::text = e.metadata->>'task_id'
    LEFT JOIN goals tg ON tg.id = t.goal_id
    LEFT JOIN goals g ON g.id::text = e.metadata->>'goal_id'
    WHERE e.user_id = $1`;

  if (filter === 'check_in') sql += " AND e.event_type = 'submitted'";
  if (filter === 'check_out') sql += " AND e.event_type = 'checkout_submitted'";
  if (filter === 'skipped') sql += " AND e.event_type = 'skipped'";
  if (filter === 'corrected') sql += ' AND e.correction_count > 0';
  if (cursor) {
    params.push(cursor.createdAt, cursor.id);
    sql += ` AND (e.created_at, e.id) < ($${params.length - 1}, $${params.length})`;
  }
  params.push(limit + 1);
  sql += ` ORDER BY e.created_at DESC, e.id DESC LIMIT $${params.length}`;
  const result = await db.query(sql, params, client);
  return result.rows;
}

async function correct(userId, id, data, client) {
  const result = await db.query(
    `UPDATE check_in_events
     SET mood = COALESCE($3, mood), note = CASE WHEN $4::boolean THEN $5 ELSE note END,
       corrected_at = NOW(), correction_count = correction_count + 1, updated_at = NOW()
     WHERE user_id = $1 AND id = $2 AND updated_at = $6::timestamptz
     RETURNING *`,
    [userId, id, data.mood || null, data.note !== undefined, data.note ?? null, data.version], client
  );
  return result.rows[0] || null;
}

async function remove(userId, id, client) {
  const result = await db.query(
    'DELETE FROM check_in_events WHERE user_id = $1 AND id = $2 RETURNING id, event_type',
    [userId, id], client
  );
  return result.rows[0] || null;
}

async function countByUser(userId, { from, to } = {}, client) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS count FROM check_in_events
     WHERE user_id = $1
       AND ($2::timestamptz IS NULL OR created_at >= $2)
       AND ($3::timestamptz IS NULL OR created_at < $3)`,
    [userId, from || null, to || null], client
  );
  return result.rows[0]?.count || 0;
}

module.exports = { create, findOwnedById, listByUser, correct, remove, countByUser };
