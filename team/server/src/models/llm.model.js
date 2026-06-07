const { z } = require('zod');
const { LLMTaskSchema } = require('./task.model');

const PlanSchema = z.object({
  tasks: z.array(LLMTaskSchema).min(1),
  summary: z.string().trim().min(1),
  next_check_in: z.string().optional(),
  adaptation_notes: z.string().nullable().optional(),
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
