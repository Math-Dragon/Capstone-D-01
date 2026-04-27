const { z } = require('zod');

const goalStatusEnum = z.enum(['active', 'completed', 'archived']);

const GoalEntity = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  deadline: z.string().nullable(),
  status: goalStatusEnum,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable(),
});

const createGoalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const updateGoalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: goalStatusEnum.optional(),
});

module.exports = {
  GoalEntity,
  createGoalSchema,
  updateGoalSchema,
  goalStatusEnum,
};
