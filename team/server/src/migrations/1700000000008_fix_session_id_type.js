'use strict';

module.exports = {
  async up(pgm) {
    await pgm.db.query(`
      ALTER TABLE audit_logs
      ALTER COLUMN session_id TYPE varchar(50)
      USING session_id::varchar(50)
    `);
    await pgm.db.query(`
      ALTER TABLE chat_messages
      ALTER COLUMN session_id TYPE varchar(50)
      USING session_id::varchar(50)
    `);
  },

  async down(pgm) {
    await pgm.db.query(`
      ALTER TABLE audit_logs
      ALTER COLUMN session_id TYPE uuid
      USING session_id::uuid
    `);
    await pgm.db.query(`
      ALTER TABLE chat_messages
      ALTER COLUMN session_id TYPE uuid
      USING session_id::uuid
    `);
  },
};
