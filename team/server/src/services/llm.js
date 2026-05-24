const { PlanSchema, SuggestionSchema, ChatResponseSchema } = require('../models/llm.model');

const RECOVERABLE_CODES = new Set(['too_big', 'too_small']);
const RECOVERABLE_FIELD_PREFIXES = ['duration_estimate'];

function isRecoverable(issue) {
  const field = issue.path[issue.path.length - 1];
  return RECOVERABLE_CODES.has(issue.code) && RECOVERABLE_FIELD_PREFIXES.includes(field);
}

function getValueAtPath(obj, path) {
  let current = obj;
  for (const seg of path) {
    if (current == null) return undefined;
    current = current[seg];
  }
  return current;
}

function _sanitize(parsed) {
  if (Array.isArray(parsed)) return { tasks: parsed, summary: 'Adjusted plan' };
  if (!parsed || typeof parsed !== 'object') return parsed;
  const clean = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key === '') continue;
    clean[key] = value;
  }
  if (clean.adjusted_plan && !clean.tasks) clean.tasks = clean.adjusted_plan;
  if (!clean.tasks && clean.content && typeof clean.content === 'string') {
    try {
      const inner = JSON.parse(clean.content);
      if (inner && typeof inner === 'object' && (Array.isArray(inner.tasks) || inner.plan)) {
        return _sanitize(inner);
      }
    } catch { /* ignore JSON parse failure */}
  }
  if (!clean.tasks && clean.plan && typeof clean.plan === 'object' && Array.isArray(clean.plan.tasks)) {
    return _sanitize(clean.plan);
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
  const match = raw.match(/([[{][\s\S]*[}\]])/);
  return match ? match[0] : raw;
}

function _parse(raw) {
  try {
    const stripped = _stripMarkdown(raw);
    if (stripped && typeof stripped === 'object') {
      return _sanitize(stripped);
    }
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

function _previewParsed(parsed) {
  try {
    return JSON.stringify(parsed).slice(0, 500);
  } catch {
    return '[unserializable parsed output]';
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
    err._meta = { parsed_output_preview: _previewParsed(parsed) };
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

function validateWithWarnings(raw) {
  const parsed = _parse(raw);
  const result = PlanSchema.safeParse(parsed);
  if (result.success) {
    return { data: result.data, violations: [] };
  }

  const recoverable = [];
  const unrecoverable = [];

  for (const err of result.error.errors) {
    if (isRecoverable(err)) {
      recoverable.push({
        path: err.path.join('.'),
        code: err.code,
        message: err.message,
        value: getValueAtPath(parsed, err.path),
        constraint: err.code === 'too_big' ? 'max:90' : 'min:25',
      });
    } else {
      unrecoverable.push(err);
    }
  }

  if (unrecoverable.length > 0) {
    const first = unrecoverable[0];
    const err = new Error(`AI output schema violation at ${first.path.join('.')}: ${first.message}`);
    err.code = 'AI_OUTPUT_INVALID';
    err.statusCode = 422;
    throw err;
  }

  return { data: parsed, violations: recoverable };
}

const PII_FIELDS = new Set(['email', 'password_hash', 'google_id', 'github_id', 'name', 'phone']);

function sanitizeContext(context) {
  if (!context || typeof context !== 'object') return context;
  if (Array.isArray(context)) {
    return context.map(sanitizeContext);
  }
  const sanitized = {};
  for (const [key, value] of Object.entries(context)) {
    if (PII_FIELDS.has(key)) continue;
    sanitized[key] = (value && typeof value === 'object')
      ? sanitizeContext(value)
      : value;
  }
  return sanitized;
}

module.exports = { validateAIOutput, validateChatOutput, validateWithWarnings, sanitizeContext, SuggestionSchema, PlanSchema, ChatResponseSchema };
