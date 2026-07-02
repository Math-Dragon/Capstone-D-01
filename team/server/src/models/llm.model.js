const { z } = require('zod');
const { LLMTaskSchema } = require('./task.model');

const DifficultyAssessmentSchema = z.object({
  level: z.enum(['easy', 'medium', 'hard', 'expert']),
  reasoning: z.string(),
}).optional();

const PlanSchema = z.object({
  tasks: z.array(LLMTaskSchema).min(1),
  summary: z.string().trim().min(1),
  next_check_in: z.string().optional(),
  adaptation_notes: z.string().nullable().optional(),
  difficulty_assessment: DifficultyAssessmentSchema,
});

const SuggestionSchema = z.object({
  tasks: z.array(LLMTaskSchema).min(1),
  summary: z.string().trim().min(1),
});

const ChatResponseSchema = z.object({
  message: z.string().min(1),
  plan: PlanSchema.nullable(),
});

module.exports = { PlanSchema, SuggestionSchema, ChatResponseSchema };
