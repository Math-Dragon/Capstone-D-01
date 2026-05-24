'use strict';

module.exports = {
  async up(pgm) {
    pgm.addColumns('audit_logs', {
      session_id: { type: 'varchar(50)' },
    });
    pgm.createIndex('audit_logs', 'session_id');

    pgm.addColumns('chat_messages', {
      session_id: { type: 'varchar(50)' },
    });
    pgm.createIndex('chat_messages', 'session_id');
  },

  async down(pgm) {
    pgm.dropColumns('chat_messages', ['session_id']);
    pgm.dropColumns('audit_logs', ['session_id']);
  },
};
