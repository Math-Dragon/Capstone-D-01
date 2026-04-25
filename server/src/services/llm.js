const { z } = require('zod');

const TaskSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  duration_estimate: z.number().int().min(25).max(90),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  planned_slot: z.enum(['morning', 'afternoon', 'evening']),
  rationale: z.string().min(1),
});

const SuggestionSchema = z.object({
  tasks: z.array(TaskSchema).min(1),
  summary: z.string(),
});

function validateAIOutput(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const err = new Error('AI output is not valid JSON: ' + error.message);
    err.code = 'AI_OUTPUT_INVALID';
    err.statusCode = 422;
    throw err;
  }

  const result = SuggestionSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.errors[0];
    const err = new Error(`AI output schema violation at ${first.path.join('.')}: ${first.message}`);
    err.code = 'AI_OUTPUT_INVALID';
    err.statusCode = 422;
    throw err;
  }

  return result.data;
}

module.exports = { validateAIOutput, SuggestionSchema, TaskSchema };
