'use strict';

module.exports = {
  async up(pgm) {
    pgm.createTable('refresh_tokens', {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
      token_hash: { type: 'varchar(255)', notNull: true },
      expires_at: { type: 'timestamptz', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createIndex('refresh_tokens', 'user_id');
    pgm.createIndex('refresh_tokens', 'token_hash');
  },

  async down(pgm) {
    pgm.dropTable('refresh_tokens');
  },
};
