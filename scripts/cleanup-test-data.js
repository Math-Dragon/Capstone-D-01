const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const { Pool } = require(path.join(rootDir, 'server', 'node_modules', 'pg'));

const databaseUrl = process.env.DATABASE_URL;
const confirm = process.env.CLEANUP_CONFIRM === 'delete-test-data';
const prefixes = (process.env.TEST_EMAIL_PREFIXES || 'tc01-tc07-ui-,tc03-tc07-,tc08-tc12-,e2e-core-,goals-test-,tasks-test-')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

if (!databaseUrl) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    const patterns = prefixes.map((prefix) => `${prefix}%@example.com`);
    const preview = await client.query(
      'select id, email from users where email like any($1::text[]) order by created_at desc',
      [patterns]
    );

    console.log(`Matched users: ${preview.rowCount}`);
    for (const row of preview.rows) {
      console.log(`- ${row.email} (${row.id})`);
    }

    if (!confirm) {
      console.log('Dry run only. Set CLEANUP_CONFIRM=delete-test-data to delete these scoped test users and dependent data.');
      return;
    }

    await client.query('begin');
    const ids = preview.rows.map((row) => row.id);
    if (ids.length > 0) {
      await client.query('delete from refresh_tokens where user_id = any($1::uuid[])', [ids]);
      await client.query('delete from audit_logs where user_id = any($1::uuid[])', [ids]);
      await client.query('delete from chat_messages where user_id = any($1::uuid[])', [ids]);
      await client.query('delete from ai_recommendations where user_id = any($1::uuid[])', [ids]);
      await client.query('delete from plan_snapshots where user_id = any($1::uuid[])', [ids]);
      await client.query('delete from student_metrics where user_id = any($1::uuid[])', [ids]);
      await client.query('delete from tasks where goal_id in (select id from goals where user_id = any($1::uuid[]))', [ids]);
      await client.query('delete from goals where user_id = any($1::uuid[])', [ids]);
      await client.query('delete from profiles where user_id = any($1::uuid[])', [ids]);
      await client.query('delete from users where id = any($1::uuid[])', [ids]);
    }
    await client.query('commit');
    console.log(`Deleted scoped test users: ${ids.length}`);
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
