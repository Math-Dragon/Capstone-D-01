const { z } = require('zod');

const preferredTimeEnum = z.enum(['morning', 'afternoon', 'evening']);

const ProfileEntity = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  timezone: z.string(),
  preferred_time: preferredTimeEnum,
  weekly_target_hours: z.number(),
  availability: z.record(z.any()),
});

module.exports = {
  ProfileEntity,
  preferredTimeEnum,
};
