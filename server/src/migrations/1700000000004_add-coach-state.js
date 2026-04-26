'use strict';

module.exports = {
  async up(pgm) {
    pgm.createTable('chat_messages', {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
      role: { type: 'varchar(10)', notNull: true },
      content: { type: 'text', notNull: true },
      plan_snapshot_summary: { type: 'text' },
      session_type: { type: 'varchar(20)' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createIndex('chat_messages', 'user_id');
    pgm.createIndex('chat_messages', ['user_id', 'created_at']);

    pgm.createTable('student_metrics', {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE', unique: true },
      streak_days: { type: 'integer', notNull: true, default: 0 },
      total_completed: { type: 'integer', notNull: true, default: 0 },
      total_skipped: { type: 'integer', notNull: true, default: 0 },
      completion_rate_7d: { type: 'numeric(3,2)', notNull: true, default: '0' },
      completion_rate_3d: { type: 'numeric(3,2)', notNull: true, default: '0' },
      avg_difficulty_7d: { type: 'numeric(2,1)', notNull: true, default: '0' },
      consecutive_skips: { type: 'integer', notNull: true, default: 0 },
      last_mood: { type: 'varchar(20)' },
      last_check_in: { type: 'timestamptz' },
      trigger_cooldowns: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.addColumns('tasks', {
      skip_reason: { type: 'varchar(20)' },
      feedback_difficulty: { type: 'integer' },
      feedback_focus: { type: 'integer' },
      feedback_notes: { type: 'text' },
      feedback_submitted_at: { type: 'timestamptz' },
    });
  },

  async down(pgm) {
    pgm.dropColumns('tasks', ['skip_reason', 'feedback_difficulty', 'feedback_focus', 'feedback_notes', 'feedback_submitted_at']);
    pgm.dropTable('student_metrics');
    pgm.dropTable('chat_messages');
  },
};
