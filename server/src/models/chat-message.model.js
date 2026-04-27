const { z } = require('zod');

const messageRoleEnum = z.enum(['user', 'assistant', 'system']);

const ChatMessageEntity = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: messageRoleEnum,
  content: z.string(),
  plan_snapshot_summary: z.string().nullable(),
  session_type: z.string().nullable(),
  created_at: z.string().datetime(),
});

module.exports = { ChatMessageEntity, messageRoleEnum };
