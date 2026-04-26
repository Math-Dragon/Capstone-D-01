const { z } = require('zod');

const TaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  description: z.string(),
  task_type: z.enum(['acquire', 'practice', 'recall', 'interleave', 'synthesize', 'review', 'assess', 'reflect']).optional(),
  duration_estimate: z.number().int().min(10).max(90),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  planned_slot: z.enum(['morning', 'afternoon', 'evening']),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  completion_criteria: z.string().optional(),
  prerequisites: z.array(z.string()).optional(),
  rationale: z.string().min(1),
});

const PlanSchema = z.object({
  tasks: z.array(TaskSchema).min(1),
  summary: z.string(),
  next_check_in: z.string().optional(),
  adaptation_notes: z.string().nullable().optional(),
});

const SuggestionSchema = z.object({
  tasks: z.array(TaskSchema).min(1),
  summary: z.string(),
});

const ChatResponseSchema = z.object({
  message: z.string().min(1),
  plan: PlanSchema.nullable(),
});

function _parse(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const err = new Error('AI output is not valid JSON: ' + error.message);
    err.code = 'AI_OUTPUT_INVALID';
    err.statusCode = 422;
    throw err;
  }
}

function validateAIOutput(raw) {
  const parsed = _parse(raw);
  const result = PlanSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.errors[0];
    const err = new Error(`AI output schema violation at ${first.path.join('.')}: ${first.message}`);
    err.code = 'AI_OUTPUT_INVALID';
    err.statusCode = 422;
    throw err;
  }
  return result.data;
}

function validateChatOutput(raw) {
  const parsed = _parse(raw);
  const result = ChatResponseSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.errors[0];
    const err = new Error(`Chat output schema violation at ${first.path.join('.')}: ${first.message}`);
    err.code = 'AI_OUTPUT_INVALID';
    err.statusCode = 422;
    throw err;
  }
  return result.data;
}

module.exports = { validateAIOutput, validateChatOutput, SuggestionSchema, PlanSchema, ChatResponseSchema, TaskSchema };
