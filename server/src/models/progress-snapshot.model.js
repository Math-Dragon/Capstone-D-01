const { z } = require('zod');

const ProgressSnapshotEntity = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  week: z.string(),
  planned_hours: z.number(),
  completed_hours: z.number(),
  completion_rate: z.number(),
  created_at: z.string().datetime(),
});

module.exports = { ProgressSnapshotEntity };
