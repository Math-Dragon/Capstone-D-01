const { PlanSchema, SuggestionSchema, ChatResponseSchema } = require('../models/llm.model');

function _sanitize(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;
  const clean = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key === '') continue;
    clean[key] = value;
  }
  if (!('plan' in clean) && 'message' in clean) {
    clean.plan = null;
  }
  if (clean.plan !== null && typeof clean.plan === 'object') {
    if (!('tasks' in clean.plan)) {
      clean.plan = null;
    } else if (Array.isArray(clean.plan.tasks) && clean.plan.tasks.length === 0) {
      clean.plan = null;
    }
  }
  return clean;
}

function _stripMarkdown(raw) {
  let s = typeof raw === 'string' ? raw.trim() : raw;
  if (typeof s === 'string' && s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return s;
}

function _extractJson(raw) {
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
}

function _parse(raw) {
  try {
    const stripped = _stripMarkdown(raw);
    const parsed = JSON.parse(stripped);
    return _sanitize(parsed);
  } catch (error) {
    try {
      const extracted = _extractJson(_stripMarkdown(raw));
      if (extracted !== _stripMarkdown(raw)) {
        const parsed = JSON.parse(extracted);
        return _sanitize(parsed);
      }
    } catch { /* extraction failed, fall through to original error */ }
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
