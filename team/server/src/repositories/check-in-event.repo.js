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
    // Truncate created_at on both sides of the comparison: the cursor carries
    // an ISO string at ms precision, so the column must be compared at the
    // same precision or same-millisecond rows are skipped. Same-ms rows then
    // order by id, and the ORDER BY below matches, so no row is lost or repeated.
    params.push(cursor.createdAt, cursor.id);
    sql += ` AND (date_trunc('milliseconds', e.created_at), e.id) < ($${params.length - 1}::timestamptz, $${params.length})`;
  }
  params.push(limit + 1);
  sql += ` ORDER BY date_trunc('milliseconds', e.created_at) DESC, e.id DESC LIMIT $${params.length}`;
  const result = await db.query(sql, params, client);
  return result.rows;
}

async function correct(userId, id, { mood, note, version }, client) {
  // Presence-based SET: an explicit null clears the field (mood: null clears
  // mood instead of being swallowed by COALESCE). The integer version column
  // is the optimistic-lock guard — timestamp comparison breaks on the
  // Postgres µs vs JS ms precision mismatch.
  const sets = [
    'version = version + 1',
    'corrected_at = NOW()',
    'correction_count = correction_count + 1',
    'updated_at = NOW()',
  ];
  const params = [userId, id, version];
  if (mood !== undefined) {
    params.push(mood);
    sets.push(`mood = $${params.length}`);
  }
  if (note !== undefined) {
    params.push(note);
    sets.push(`note = $${params.length}`);
  }
  const result = await db.query(
    `UPDATE check_in_events
     SET ${sets.join(', ')}
     WHERE user_id = $1 AND id = $2 AND version = $3
     RETURNING *`,
    params,
    client
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

async function countByUser(userId, { from, to, timezone } = {}, client) {
  // from/to are 'YYYY-MM-DD' day keys in the caller's timezone; the bounds
  // are the UTC instants of local midnight, computed in Postgres (DST-safe),
  // so they align with the timezone-aware buckets built by the service.
  const result = await db.query(
    `SELECT COUNT(*)::int AS count FROM check_in_events
     WHERE user_id = $1
       AND ($2::date IS NULL OR created_at >= ($2::date::timestamp AT TIME ZONE $4::text))
       AND ($3::date IS NULL OR created_at < ($3::date::timestamp AT TIME ZONE $4::text))`,
    [userId, from || null, to || null, timezone || 'UTC'], client
  );
  return result.rows[0]?.count || 0;
}

module.exports = { create, findOwnedById, listByUser, correct, remove, countByUser };
