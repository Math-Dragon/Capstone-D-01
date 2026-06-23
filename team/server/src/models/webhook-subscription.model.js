const { z } = require('zod');

const webhookEventEnum = z.enum(['task.completed', 'ai.recommendation.accepted']);
const webhookStatusEnum = z.enum(['active', 'disabled']);

const webhookSubscriptionEntity = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  target_url: z.string().url(),
  events: z.array(webhookEventEnum),
  signing_secret: z.string().nullable(),
  status: webhookStatusEnum,
  last_delivery_status: z.number().int().nullable(),
  last_delivery_error: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().nullable(),
});

const webhookRegistrationSchema = z.object({
  url: z.string().url().refine((value) => value.startsWith('https://'), 'Webhook URL must use https'),
  events: z.array(webhookEventEnum).min(1),
  secret: z.string().min(8).max(255).optional(),
});

module.exports = {
  webhookEventEnum,
  webhookStatusEnum,
  webhookSubscriptionEntity,
  webhookRegistrationSchema,
};
