const { z } = require('zod');
const { coachActionEnum } = require('../constants/enums');

const moodEnum = z.enum(['great', 'good', 'okay', 'struggling', 'overwhelmed', 'drained']);
const skipReasonEnum = z.enum(['too_hard', 'no_time', 'not_relevant', 'not_interested', 'other']);

const coachRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('INITIAL_PLAN'),
    payload: z.object({
      goal: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        deadline: z.string().optional(),
      }).optional(),
      profile: z.object({
        weekly_target_hours: z.number().optional(),
        preferred_time: z.string().optional(),
        availability: z.array(z.string()).optional(),
      }).optional(),
    }).optional(),
    client_timestamp: z.number().optional(),
    app_version: z.string().optional(),
  }),
  z.object({
    action: z.literal('CHECK_IN'),
    payload: z.object({
      mood: moodEnum,
      note: z.string().max(500).optional(),
    }),
    client_timestamp: z.number().optional(),
    app_version: z.string().optional(),
  }),
  z.object({
    action: z.literal('COMPLETE_TASK'),
    payload: z.object({
      taskId: z.string().uuid(),
    }),
    client_timestamp: z.number().optional(),
    app_version: z.string().optional(),
  }),
  z.object({
    action: z.literal('SKIP_TASK'),
    payload: z.object({
      taskId: z.string().uuid(),
      reason: skipReasonEnum.optional(),
      note: z.string().max(500).optional(),
    }),
    client_timestamp: z.number().optional(),
    app_version: z.string().optional(),
  }),
  z.object({
    action: z.literal('SUBMIT_FEEDBACK'),
    payload: z.object({
      taskId: z.string().uuid(),
      difficulty: z.number().int().min(1).max(5),
      focus: z.number().int().min(1).max(5),
      notes: z.string().max(1000).optional(),
    }),
    client_timestamp: z.number().optional(),
    app_version: z.string().optional(),
  }),
  z.object({
    action: z.literal('MODIFY_TASK'),
    payload: z.object({
      taskId: z.string().uuid(),
    }),
    client_timestamp: z.number().optional(),
    app_version: z.string().optional(),
  }),
  z.object({
    action: z.literal('REQUEST_ADJUSTMENT'),
    payload: z.object({
      goal: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        deadline: z.string().optional(),
      }).optional(),
      profile: z.object({
        weekly_target_hours: z.number().optional(),
        preferred_time: z.string().optional(),
        availability: z.array(z.string()).optional(),
      }).optional(),
    }).optional(),
    client_timestamp: z.number().optional(),
    app_version: z.string().optional(),
  }),
  z.object({
    action: z.literal('CHAT_MESSAGE'),
    payload: z.object({
      message: z.string().min(1).max(2000),
    }),
    client_timestamp: z.number().optional(),
    app_version: z.string().optional(),
  }),
  z.object({
    action: z.literal('CRISIS_SIGNAL'),
    payload: z.object({
      note: z.string().max(500).optional(),
    }).optional(),
    client_timestamp: z.number().optional(),
    app_version: z.string().optional(),
  }),
  z.object({
    action: z.literal('ACCEPT_PROPOSAL'),
    payload: z.object({
      plan: z.object({
        tasks: z.array(z.any()).min(1),
        summary: z.string(),
      }),
    }),
    client_timestamp: z.number().optional(),
    app_version: z.string().optional(),
  }),
]);

const decideSchema = z.object({
  decision: z.enum(['accepted', 'rejected']),
  session_id: z.string().optional(),
});

const decideParamsSchema = z.object({
  recId: z.string().uuid(),
  taskId: z.string().uuid(),
});

module.exports = { coachRequestSchema, decideSchema, decideParamsSchema, coachActionEnum, moodEnum, skipReasonEnum };
