'use strict';

module.exports = {
  async up(pgm) {
    pgm.createExtension('pgcrypto', { ifNotExists: true });

    pgm.createTable('users', {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      email: { type: 'varchar(255)', notNull: true, unique: true },
      password_hash: { type: 'varchar(255)', notNull: true },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createTable('profiles', {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE', unique: true },
      timezone: { type: 'varchar(50)', notNull: true, default: "'Asia/Jakarta'" },
      preferred_time: { type: 'varchar(20)', notNull: true, default: "'morning'" },
      weekly_target_hours: { type: 'numeric(4,1)', notNull: true, default: '5.0' },
      availability: { type: 'jsonb', notNull: true, default: "'{}'::jsonb" },
    });

    pgm.createTable('goals', {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
      title: { type: 'varchar(255)', notNull: true },
      description: { type: 'text' },
      deadline: { type: 'date' },
      status: { type: 'varchar(20)', notNull: true, default: "'active'" },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createIndex('goals', 'user_id');

    pgm.createTable('tasks', {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      goal_id: { type: 'uuid', notNull: true, references: 'goals(id)', onDelete: 'CASCADE' },
      title: { type: 'varchar(255)', notNull: true },
      description: { type: 'text' },
      duration_estimate: { type: 'integer', notNull: true },
      planned_date: { type: 'date' },
      planned_slot: { type: 'varchar(20)' },
      status: { type: 'varchar(20)', notNull: true, default: "'todo'" },
      source: { type: 'varchar(10)', notNull: true, default: "'manual'" },
      actual_duration: { type: 'integer' },
      completed_at: { type: 'timestamptz' },
      rationale: { type: 'text' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createIndex('tasks', 'goal_id');
    pgm.createIndex('tasks', ['planned_date', 'status']);

    pgm.createTable('ai_recommendations', {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
      goal_id: { type: 'uuid', references: 'goals(id)' },
      type: { type: 'varchar(20)', notNull: true },
      input_context: { type: 'jsonb', notNull: true },
      output: { type: 'jsonb', notNull: true },
      status: { type: 'varchar(20)', notNull: true, default: "'pending'" },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createIndex('ai_recommendations', 'user_id');
    pgm.createIndex('ai_recommendations', 'goal_id');

    pgm.createTable('progress_snapshots', {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
      week: { type: 'varchar(8)', notNull: true },
      planned_hours: { type: 'numeric(5,1)', notNull: true, default: '0' },
      completed_hours: { type: 'numeric(5,1)', notNull: true, default: '0' },
      completion_rate: { type: 'numeric(3,2)', notNull: true, default: '0' },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createIndex('progress_snapshots', 'user_id');
    pgm.addConstraint('progress_snapshots', 'progress_snapshots_user_week_unique', {
      unique: ['user_id', 'week'],
    });

    pgm.createTable('audit_logs', {
      id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
      user_id: { type: 'uuid', references: 'users(id)' },
      recommendation_id: { type: 'uuid', references: 'ai_recommendations(id)' },
      action: { type: 'varchar(50)', notNull: true },
      metadata: { type: 'jsonb', notNull: true, default: "'{}'::jsonb" },
      created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });

    pgm.createIndex('audit_logs', 'user_id');
  },

  async down(pgm) {
    pgm.dropTable('audit_logs');
    pgm.dropTable('progress_snapshots');
    pgm.dropTable('ai_recommendations');
    pgm.dropTable('tasks');
    pgm.dropTable('goals');
    pgm.dropTable('profiles');
    pgm.dropTable('users');
    pgm.dropExtension('pgcrypto', { ifExists: true });
  },
};
