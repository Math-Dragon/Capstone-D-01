const { z } = require('zod');

const moods = ['great', 'good', 'okay', 'struggling', 'overwhelmed', 'drained'];
const eventTypes = ['submitted', 'skipped', 'checkout_submitted'];
const sources = ['daily_gateway', 'manual', 'checkout', 'system'];
const reasonCodes = ['incorrect_mood', 'incorrect_note', 'incorrect_context', 'other'];

const contextSchema = z.object({
  task_id: z.string().uuid().nullable().optional(),
  goal_id: z.string().uuid().nullable().optional(),
  recommendation_id: z.string().uuid().nullable().optional(),
  coach_session_id: z.string().max(128).nullable().optional(),
  reflection_reason: z.string().max(80).nullable().optional(),
  feedback_difficulty: z.number().int().min(1).max(5).nullable().optional(),
  feedback_focus: z.number().int().min(1).max(5).nullable().optional(),
}).strict();

const createEventSchema = z.object({
  client_event_id: z.string().uuid(),
  event_type: z.enum(eventTypes),
  mood: z.enum(moods).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  source: z.enum(sources),
  client_timestamp: z.string().datetime().nullable().optional(),
  app_version: z.string().trim().max(50).nullable().optional(),
  context: contextSchema.default({}),
}).strict().superRefine((data, ctx) => {
  if (data.event_type === 'submitted' && !data.mood) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['mood'], message: 'Mood wajib untuk check-in.' });
  }
  if (data.event_type === 'skipped' && (data.mood != null || data.note != null)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['event_type'], message: 'Event dilewati tidak boleh memuat mood atau catatan.' });
  }
  if (data.event_type === 'checkout_submitted') {
    const hasReflection = data.mood || data.note || data.context.reflection_reason ||
      data.context.feedback_difficulty || data.context.feedback_focus;
    if (!hasReflection) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['event_type'], message: 'Check-out membutuhkan minimal satu refleksi.' });
    }
  }
});

const historyQuerySchema = z.object({
  filter: z.enum(['all', 'check_in', 'check_out', 'skipped', 'corrected']).default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(500).optional(),
});

const historyParamsSchema = z.object({ id: z.string().uuid() });

const correctionSchema = z.object({
  mood: z.enum(moods).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  reason_code: z.enum(reasonCodes).optional(),
  version: z.coerce.number().int().min(0),
}).strict().refine((value) => value.mood !== undefined || value.note !== undefined, {
  message: 'Minimal satu field koreksi wajib dikirim.',
});

const overviewQuerySchema = z.object({ period: z.enum(['7d', '30d', 'all']).default('7d') });

module.exports = {
  createEventSchema,
  historyQuerySchema,
  historyParamsSchema,
  correctionSchema,
  overviewQuerySchema,
};
