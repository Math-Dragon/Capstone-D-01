const { z } = require('zod');

const AuditLogEntity = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  recommendation_id: z.string().uuid().nullable(),
  action: z.string(),
  metadata: z.record(z.any()),
  created_at: z.string().datetime(),
});

module.exports = { AuditLogEntity };
