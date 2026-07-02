const { z } = require('zod');
const { goalStatusEnum } = require('../constants/enums');

const difficultyEnum = z.enum(['easy', 'medium', 'hard', 'expert']);

const GoalEntity = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  deadline: z.string().nullable(),
  status: goalStatusEnum,
  difficulty: difficultyEnum.default('medium'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable(),
});

const createGoalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  difficulty: difficultyEnum.optional(),
});

const updateGoalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: goalStatusEnum.optional(),
  difficulty: difficultyEnum.optional(),
});

module.exports = {
  GoalEntity,
  createGoalSchema,
  updateGoalSchema,
  difficultyEnum,
  goalStatusEnum,
};
