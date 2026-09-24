'use strict';

module.exports = {
  async up(pgm) {
    pgm.createTable('check_in_events', {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
      client_event_id: { type: 'uuid', notNull: true },
      event_type: { type: 'varchar(30)', notNull: true },
      mood: { type: 'varchar(20)' },
      note: { type: 'text' },
      source: { type: 'varchar(30)', notNull: true },
      client_timestamp: { type: 'timestamptz' },
      app_version: { type: 'varchar(50)' },
      metadata: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
      corrected_at: { type: 'timestamptz' },
      correction_count: { type: 'integer', notNull: true, default: 0 },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.addConstraint('check_in_events', 'check_in_events_user_client_unique', {
      unique: ['user_id', 'client_event_id'],
    });
    pgm.addConstraint('check_in_events', 'check_in_events_type_check', {
      check: "event_type IN ('submitted', 'skipped', 'checkout_submitted')",
    });
    pgm.addConstraint('check_in_events', 'check_in_events_source_check', {
      check: "source IN ('daily_gateway', 'manual', 'checkout', 'system')",
    });
    pgm.addConstraint('check_in_events', 'check_in_events_mood_check', {
      check: "mood IS NULL OR mood IN ('great', 'good', 'okay', 'struggling', 'overwhelmed', 'drained')",
    });
    pgm.addConstraint('check_in_events', 'check_in_events_note_length_check', {
      check: 'note IS NULL OR char_length(note) <= 500',
    });
    pgm.addConstraint('check_in_events', 'check_in_events_payload_check', {
      check: `(event_type = 'submitted' AND mood IS NOT NULL)
        OR (event_type = 'skipped' AND mood IS NULL AND note IS NULL)
        OR event_type = 'checkout_submitted'`,
    });

    pgm.createIndex('check_in_events', ['user_id', 'created_at', 'id'], {
      name: 'check_in_events_user_cursor_idx',
    });
    pgm.createIndex('check_in_events', ['user_id', 'event_type', 'created_at'], {
      name: 'check_in_events_user_type_idx',
    });
  },

  async down(pgm) {
    pgm.dropTable('check_in_events');
  },
};
