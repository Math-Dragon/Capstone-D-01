const { z } = require('zod');

const RefreshTokenEntity = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  token_hash: z.string(),
  expires_at: z.string().datetime(),
  created_at: z.string().datetime(),
});

module.exports = { RefreshTokenEntity };
