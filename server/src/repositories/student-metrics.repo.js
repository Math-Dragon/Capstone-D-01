const db = require('../db');

async function findByUserId(userId, client) {
  const result = await db.query(
    'SELECT * FROM student_metrics WHERE user_id = $1',
    [userId],
    client
  );
  return result.rows[0] || null;
}

async function upsert(userId, updates, client) {
  const updateKeys = Object.keys(updates);
  if (updateKeys.length === 0) return findByUserId(userId, client);

  const cols = ['user_id', ...updateKeys];
  const vals = [userId, ...updateKeys.map(k => {
    if (k === 'trigger_cooldowns') return JSON.stringify(updates[k]);
    return updates[k];
  })];
  const ph = vals.map((_, i) => `$${i + 1}`);
  const setClauses = updateKeys.map(k =>
    k === 'trigger_cooldowns' ? 'trigger_cooldowns = EXCLUDED.trigger_cooldowns' : `${k} = EXCLUDED.${k}`
  );

  const result = await db.query(
    `INSERT INTO student_metrics (${cols.join(', ')})
     VALUES (${ph.join(', ')})
     ON CONFLICT (user_id) DO UPDATE SET ${setClauses.join(', ')}, updated_at = NOW()
     RETURNING *`,
    vals,
    client
  );
  return result.rows[0];
}

async function computeRollingMetrics(userId, client) {
  const result = await db.query(
    `SELECT
      COUNT(*) FILTER (WHERE t.status IN ('done','completed') AND t.completed_at >= NOW() - INTERVAL '7 days')::numeric
        / NULLIF(COUNT(*) FILTER (WHERE t.planned_date >= NOW() - INTERVAL '7 days'), 0)
        AS completion_rate_7d,
      COUNT(*) FILTER (WHERE t.status IN ('done','completed') AND t.completed_at >= NOW() - INTERVAL '3 days')::numeric
        / NULLIF(COUNT(*) FILTER (WHERE t.planned_date >= NOW() - INTERVAL '3 days'), 0)
        AS completion_rate_3d,
      AVG(t.feedback_difficulty) FILTER (
        WHERE t.feedback_difficulty IS NOT NULL
          AND t.feedback_submitted_at >= NOW() - INTERVAL '7 days'
      ) AS avg_difficulty_7d
     FROM tasks t
     INNER JOIN goals g ON t.goal_id = g.id
     WHERE g.user_id = $1`,
    [userId],
    client
  );
  const row = result.rows[0] || {};
  return {
    completion_rate_7d: Number(row.completion_rate_7d) || 0,
    completion_rate_3d: Number(row.completion_rate_3d) || 0,
    avg_difficulty_7d: Number(row.avg_difficulty_7d) || 0,
  };
}

module.exports = { findByUserId, upsert, computeRollingMetrics };
