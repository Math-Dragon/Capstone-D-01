exports.up = async (pgm) => {
  pgm.createTable('plan_snapshots', {
    id: { type: 'uuid', default: pgm.func('gen_random_uuid()'), primaryKey: true },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    trigger_id: { type: 'varchar(20)', notNull: true },
    adaptation_type: { type: 'varchar(20)', notNull: true },
    tasks_snapshot: { type: 'jsonb', notNull: true },
    plan_summary: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('now()') },
  });

  pgm.createIndex('plan_snapshots', 'user_id');
  pgm.createIndex('plan_snapshots', 'created_at');
};

exports.down = async (pgm) => {
  pgm.dropTable('plan_snapshots');
};
