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

module.exports = { findByUserId, upsert };
