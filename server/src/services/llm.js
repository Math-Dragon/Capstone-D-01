const { PlanSchema, SuggestionSchema, ChatResponseSchema } = require('../models/llm.model');

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

module.exports = { validateAIOutput, validateChatOutput, SuggestionSchema, PlanSchema, ChatResponseSchema };
