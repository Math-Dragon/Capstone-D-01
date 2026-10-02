'use strict';

// Additive-only columns backing the adaptive proposal contract (HITL staging,
// expiry, idempotent resolution). All columns are nullable so pre-existing
// coach_plan / initial-plan rows stay valid without backfill.
exports.up = async (pgm) => {
  pgm.addColumns('ai_recommendations', {
    adaptation_type: { type: 'varchar(32)' },
    evidence_summary: { type: 'jsonb' },
    plan_diff: { type: 'jsonb' },
    base_plan_snapshot_id: { type: 'uuid' },
    result_plan_snapshot_id: { type: 'uuid' },
    expires_at: { type: 'timestamptz' },
    resolved_at: { type: 'timestamptz' },
    resolution_idempotency_key: { type: 'varchar(128)' },
    resolution_result: { type: 'jsonb' },
  });

  pgm.addColumns('plan_snapshots', {
    goal_id: { type: 'uuid' },
    snapshot_kind: { type: 'varchar(16)', notNull: true, default: 'undo' },
  });

  pgm.createIndex('ai_recommendations', ['user_id', 'type', 'status']);
};

exports.down = async (pgm) => {
  pgm.dropIndex('ai_recommendations', ['user_id', 'type', 'status']);

  pgm.dropColumns('plan_snapshots', ['goal_id', 'snapshot_kind']);

  pgm.dropColumns('ai_recommendations', [
    'adaptation_type',
    'evidence_summary',
    'plan_diff',
    'base_plan_snapshot_id',
    'result_plan_snapshot_id',
    'expires_at',
    'resolved_at',
    'resolution_idempotency_key',
    'resolution_result',
  ]);
};
