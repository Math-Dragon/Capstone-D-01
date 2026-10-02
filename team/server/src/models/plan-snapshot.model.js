const { z } = require('zod');

const PlanSnapshotEntity = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  trigger_id: z.string(),
  adaptation_type: z.string(),
  tasks_snapshot: z.any(),
  plan_summary: z.string().nullable(),
  goal_id: z.string().uuid().nullable().optional(),
  snapshot_kind: z.string().default('undo'),
  created_at: z.string().datetime(),
});

module.exports = { PlanSnapshotEntity };
