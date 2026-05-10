const db = require('../db');

exports.up = async function up() {
  await db.query(`
    ALTER TABLE tasks ADD COLUMN task_type varchar(20) DEFAULT NULL
  `);
};

exports.down = async function down() {
  await db.query(`
    ALTER TABLE tasks DROP COLUMN IF EXISTS task_type
  `);
};