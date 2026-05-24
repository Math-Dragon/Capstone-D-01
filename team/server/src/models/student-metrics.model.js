const { z } = require('zod');

const StudentMetricsEntity = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  streak_days: z.number().int(),
  total_completed: z.number().int(),
  total_skipped: z.number().int(),
  completion_rate_7d: z.number(),
  completion_rate_3d: z.number(),
  avg_difficulty_7d: z.number(),
  consecutive_skips: z.number().int(),
  last_mood: z.string().nullable(),
  last_check_in: z.string().datetime().nullable(),
  trigger_cooldowns: z.record(z.any()),
  updated_at: z.string().datetime(),
});

module.exports = { StudentMetricsEntity };
