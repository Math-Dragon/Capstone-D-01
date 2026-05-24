const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

if (process.env.NODE_ENV === 'production') {
  console.error('Seed script cannot run in production');
  process.exit(1);
}

const db = require('../src/db');
const bcrypt = require('bcryptjs');

async function seed() {
  const hash = await bcrypt.hash('password123', 12);

  const result = await db.withTransaction(async (client) => {
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *`,
      ['demo@example.com', hash]
    );
    const user = userResult.rows[0];

    await client.query(
      `INSERT INTO profiles (user_id, timezone, preferred_time, weekly_target_hours, availability)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        'Asia/Jakarta',
        'morning',
        10,
        JSON.stringify({ mon: ['08:00-10:00'], wed: ['08:00-10:00'], fri: ['08:00-10:00'] }),
      ]
    );

    const goalResult = await client.query(
      `INSERT INTO goals (user_id, title, description, deadline) VALUES ($1, $2, $3, $4) RETURNING *`,
      [user.id, 'Learn React Fundamentals', 'Master hooks, context, and state management', '2026-05-30']
    );
    const goal = goalResult.rows[0];

    await client.query(
      `INSERT INTO tasks (goal_id, title, duration_estimate, planned_date, planned_slot, source)
       VALUES
         ($1, $2, $3, $4, $5, $6),
         ($1, $7, $8, $9, $10, $6)`,
      [
        goal.id,
        'Study useEffect hook', 45, '2026-04-24', 'morning', 'manual',
        'Build todo app with Context', 60, '2026-04-25', 'afternoon',
      ]
    );

    return user;
  });

  console.log('✅ Seed completed — demo user:', result.email);
  await db.pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
