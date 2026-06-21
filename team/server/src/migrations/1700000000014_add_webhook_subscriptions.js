'use strict';

exports.up = async (pgm) => {
  pgm.createTable('webhook_subscriptions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users', onDelete: 'CASCADE' },
    target_url: { type: 'text', notNull: true },
    events: { type: 'jsonb', notNull: true, default: '[]' },
    signing_secret: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'active' },
    last_delivery_status: { type: 'integer' },
    last_delivery_error: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', default: pgm.func('CURRENT_TIMESTAMP') },
  });

  pgm.addConstraint('webhook_subscriptions', 'webhook_subscriptions_status_check', {
    check: "status IN ('active', 'disabled')",
  });

  pgm.createIndex('webhook_subscriptions', ['user_id', 'target_url'], {
    name: 'webhook_subscriptions_user_target_unique',
    unique: true,
  });

  pgm.createIndex('webhook_subscriptions', 'user_id', {
    name: 'webhook_subscriptions_user_id_idx',
  });
};

exports.down = async (pgm) => {
  pgm.dropIndex('webhook_subscriptions', 'user_id', {
    name: 'webhook_subscriptions_user_id_idx',
  });
  pgm.dropIndex('webhook_subscriptions', ['user_id', 'target_url'], {
    name: 'webhook_subscriptions_user_target_unique',
  });
  pgm.dropConstraint('webhook_subscriptions', 'webhook_subscriptions_status_check');
  pgm.dropTable('webhook_subscriptions');
};
