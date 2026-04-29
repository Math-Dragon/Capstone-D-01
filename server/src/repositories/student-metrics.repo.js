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
  const existing = await findByUserId(userId, client);
  if (!existing) {
    const result = await db.query(
      `INSERT INTO student_metrics (user_id, streak_days, total_completed, total_skipped,
         completion_rate_7d, completion_rate_3d, avg_difficulty_7d, consecutive_skips,
         last_mood, last_check_in, trigger_cooldowns)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        userId,
        updates.streak_days || 0,
        updates.total_completed || 0,
        updates.total_skipped || 0,
        updates.completion_rate_7d || 0,
        updates.completion_rate_3d || 0,
        updates.avg_difficulty_7d || 0,
        updates.consecutive_skips || 0,
        updates.last_mood || null,
        updates.last_check_in || null,
        JSON.stringify(updates.trigger_cooldowns || {}),
      ],
      client
    );
    return result.rows[0];
  }

  const allowed = [
    'streak_days', 'total_completed', 'total_skipped',
    'completion_rate_7d', 'completion_rate_3d', 'avg_difficulty_7d',
    'consecutive_skips', 'last_mood', 'last_check_in',
  ];
  const sets = ['updated_at = NOW()'];
  const vals = [];
  let idx = 1;

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      sets.push(`${key} = $${idx++}`);
      vals.push(updates[key]);
    }
  }
  if (updates.trigger_cooldowns !== undefined) {
    sets.push(`trigger_cooldowns = $${idx++}`);
    vals.push(JSON.stringify(updates.trigger_cooldowns));
  }

  vals.push(userId);
  const result = await db.query(
    `UPDATE student_metrics SET ${sets.join(', ')} WHERE user_id = $${idx} RETURNING *`,
    vals,
    client
  );
  return result.rows[0];
}

async function computeRollingMetrics(userId, client) {
  const result = await db.query(
    `SELECT
      COUNT(*) FILTER (WHERE status IN ('done','completed') AND completed_at >= NOW() - INTERVAL '7 days')::numeric
        / NULLIF(COUNT(*) FILTER (WHERE planned_date >= NOW() - INTERVAL '7 days'), 0)
        AS completion_rate_7d,
      COUNT(*) FILTER (WHERE status IN ('done','completed') AND completed_at >= NOW() - INTERVAL '3 days')::numeric
        / NULLIF(COUNT(*) FILTER (WHERE planned_date >= NOW() - INTERVAL '3 days'), 0)
        AS completion_rate_3d,
      AVG(feedback_difficulty) FILTER (
        WHERE feedback_difficulty IS NOT NULL
          AND feedback_submitted_at >= NOW() - INTERVAL '7 days'
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
