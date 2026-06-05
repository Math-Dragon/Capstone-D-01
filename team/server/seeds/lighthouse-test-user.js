const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const db = require('../src/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

async function seed() {
  console.log('Seeding lighthouse test users...');

  const tokens = {};

  await db.withTransaction(async (client) => {
    const hash = await bcrypt.hash('LighthouseTest123!', 12);

    await client.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`,
      ['lighthouse@test.local', hash]
    );
    console.log('  ✓ lighthouse@test.local');

    const adminHash = await bcrypt.hash('!1234Password', 12);
    await client.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`,
      ['admin123@example.com', adminHash]
    );
    console.log('  ✓ admin123@example.com');
  });

  // Generate tokens directly so Cypress can use them without hitting rate limiter
  const userResult = await db.query("SELECT id, email FROM users WHERE email IN ('lighthouse@test.local', 'admin123@example.com')");
  for (const row of userResult.rows) {
    tokens[row.email] = jwt.sign(
      { id: row.id, email: row.email },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
  }

  const tokenPath = path.resolve(__dirname, 'data/lighthouse-tokens.json');
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
  console.log(`  ✓ tokens saved to ${tokenPath}`);

  console.log('Done.');
  await db.pool.end();
  process.exit(0);
}

async function cleanup() {
  console.log('Cleaning up lighthouse test users...');

  const ids = await db.query(
    "SELECT id FROM users WHERE email IN ('lighthouse@test.local', 'admin123@example.com')"
  );

  if (ids.rows.length > 0) {
    const userIds = ids.rows.map(r => r.id);

    // audit_logs is the only table without ON DELETE CASCADE
    // must be cleared manually before deleting users
    await db.query('DELETE FROM audit_logs WHERE user_id = ANY($1)', [userIds]);

    // All other child tables (goals, ai_recommendations, refresh_tokens,
    // chat_messages, student_metrics, plan_snapshots, profiles, progress_snapshots)
    // use ON DELETE CASCADE — they clean up automatically
    await db.query("DELETE FROM users WHERE email IN ('lighthouse@test.local', 'admin123@example.com')");
    console.log('  ✓ users cleaned');
  } else {
    console.log('  ✓ no users to clean');
  }

  const tokenPath = path.resolve(__dirname, 'data/lighthouse-tokens.json');
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
    console.log('  ✓ tokens cleaned');
  }

  await db.pool.end();
  process.exit(0);
}

const action = process.argv[2];
if (action === 'cleanup') {
  cleanup().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  seed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
