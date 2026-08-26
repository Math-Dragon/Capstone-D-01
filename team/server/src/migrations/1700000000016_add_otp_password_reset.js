'use strict';

exports.up = async (pgm) => {
  pgm.addColumns('users', {
    phone_number: { type: 'varchar(32)' },
    phone_verified_at: { type: 'timestamptz' },
  });

  pgm.createIndex('users', 'phone_number', {
    unique: true,
    where: 'phone_number IS NOT NULL',
    name: 'users_phone_number_unique',
  });

  pgm.createTable('otp_challenges', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: 'users(id)', onDelete: 'CASCADE' },
    purpose: { type: 'varchar(30)', notNull: true },
    identifier: { type: 'varchar(255)', notNull: true },
    identifier_hash: { type: 'varchar(255)', notNull: true },
    channel: { type: 'varchar(20)', notNull: true },
    otp_hash: { type: 'varchar(255)', notNull: true },
    status: { type: 'varchar(20)', notNull: true, default: 'pending' },
    attempt_count: { type: 'integer', notNull: true, default: 0 },
    expires_at: { type: 'timestamptz', notNull: true },
    consumed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz' },
  });

  pgm.addConstraint('otp_challenges', 'otp_challenges_purpose_check', {
    check: "purpose IN ('password_reset', 'phone_verify')",
  });

  pgm.addConstraint('otp_challenges', 'otp_challenges_channel_check', {
    check: "channel IN ('email', 'sms')",
  });

  pgm.addConstraint('otp_challenges', 'otp_challenges_status_check', {
    check: "status IN ('pending', 'consumed', 'expired', 'locked')",
  });

  pgm.createIndex('otp_challenges', ['identifier_hash', 'channel', 'purpose', 'created_at'], {
    name: 'otp_challenges_identifier_lookup_idx',
  });

  pgm.createIndex('otp_challenges', ['user_id', 'purpose', 'status'], {
    name: 'otp_challenges_user_purpose_status_idx',
  });

  pgm.createTable('password_reset_sessions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    otp_challenge_id: { type: 'uuid', notNull: true, references: 'otp_challenges(id)', onDelete: 'CASCADE' },
    token_hash: { type: 'varchar(255)', notNull: true, unique: true },
    expires_at: { type: 'timestamptz', notNull: true },
    used_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('password_reset_sessions', 'user_id', {
    name: 'password_reset_sessions_user_id_idx',
  });

  pgm.createIndex('password_reset_sessions', 'token_hash', {
    unique: true,
    where: 'used_at IS NULL',
    name: 'password_reset_sessions_active_token_idx',
  });
};

exports.down = async (pgm) => {
  pgm.dropTable('password_reset_sessions');
  pgm.dropTable('otp_challenges');
  pgm.dropIndex('users', 'phone_number', { name: 'users_phone_number_unique' });
  pgm.dropColumns('users', ['phone_number', 'phone_verified_at']);
};
