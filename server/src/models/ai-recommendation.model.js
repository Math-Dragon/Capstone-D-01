const { z } = require('zod');

const recommendationStatusEnum = z.enum(['pending', 'accepted', 'rejected']);

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
