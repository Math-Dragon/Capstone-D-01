const { z } = require('zod');

const coachActionEnum = z.enum([
  'INITIAL_PLAN', 'CHECK_IN', 'COMPLETE_TASK', 'SKIP_TASK',
  'MODIFY_TASK', 'SUBMIT_FEEDBACK', 'REQUEST_ADJUSTMENT',
  'CHAT_MESSAGE', 'CRISIS_SIGNAL',
]);

const coachActionSchema = z.object({
  action: coachActionEnum,
  payload: z.record(z.any()),
  client_timestamp: z.number().optional(),
  app_version: z.string().optional(),
});

module.exports = { coachActionSchema, coachActionEnum };
