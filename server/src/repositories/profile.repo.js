const db = require('../db');

async function findByUserId(userId, client) {
  const result = await db.query('SELECT * FROM profiles WHERE user_id = $1', [userId], client);
  return result.rows[0] || null;
}

async function create({ user_id, timezone, preferred_time, weekly_target_hours, availability }, client) {
  const result = await db.query(
    `INSERT INTO profiles (user_id, timezone, preferred_time, weekly_target_hours, availability)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [user_id, timezone, preferred_time, weekly_target_hours, availability || {}],
    client
  );
  return result.rows[0];
}

async function update(userId, data, client) {
  const allowed = ['timezone', 'preferred_time', 'weekly_target_hours', 'availability'];
  const sets = [];
  const vals = [];
  let i = 1;

  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = $${i++}`);
      vals.push(data[key]);
    }
  }
  if (sets.length === 0) return findByUserId(userId, client);

  vals.push(userId);
  const result = await db.query(
    `UPDATE profiles SET ${sets.join(', ')} WHERE user_id = $${i} RETURNING *`,
    vals,
    client
  );
  return result.rows[0];
}

module.exports = { findByUserId, create, update };
