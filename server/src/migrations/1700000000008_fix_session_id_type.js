'use strict';

module.exports = {
  async up(pgm) {
    pgm.db.query(`
      ALTER TABLE audit_logs
      ALTER COLUMN session_id TYPE varchar(50)
      USING session_id::varchar(50)
    `);
    pgm.db.query(`
      ALTER TABLE chat_messages
      ALTER COLUMN session_id TYPE varchar(50)
      USING session_id::varchar(50)
    `);
  },

  async down(pgm) {
    pgm.db.query(`
      ALTER TABLE audit_logs
      ALTER COLUMN session_id TYPE uuid
      USING session_id::uuid
    `);
    pgm.db.query(`
      ALTER TABLE chat_messages
      ALTER COLUMN session_id TYPE uuid
      USING session_id::uuid
    `);
  },
};
