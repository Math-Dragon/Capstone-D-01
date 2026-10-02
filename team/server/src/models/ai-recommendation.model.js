const { z } = require('zod');
const { recommendationStatusEnum } = require('../constants/enums');

const AiRecommendationEntity = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  goal_id: z.string().uuid().nullable(),
  type: z.string(),
  input_context: z.record(z.any()),
  output: z.record(z.any()),
  status: recommendationStatusEnum,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable(),
  // Adaptive proposal columns (null for legacy coach_plan / initial plan rows).
  adaptation_type: z.string().nullable(),
  evidence_summary: z.array(z.any()).nullable(),
  plan_diff: z.record(z.any()).nullable(),
  base_plan_snapshot_id: z.string().uuid().nullable(),
  result_plan_snapshot_id: z.string().uuid().nullable(),
  expires_at: z.string().datetime().nullable(),
  resolved_at: z.string().datetime().nullable(),
  resolution_idempotency_key: z.string().nullable(),
  resolution_result: z.record(z.any()).nullable(),
});

const suggestPlanSchema = z.object({
  goalId: z.string().uuid(),
  context: z.record(z.any()).optional(),
});

module.exports = {
  AiRecommendationEntity,
  suggestPlanSchema,
  recommendationStatusEnum,
};
