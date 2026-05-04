const { z } = require('zod');

const UserEntity = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  password_hash: z.string().nullable(),
  google_id: z.string().nullable().optional(),
  github_id: z.string().nullable().optional(),
  created_at: z.string().datetime(),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/\d/, 'Must contain a number'),
  timezone: z.string().optional(),
  preferred_time: z.string().optional(),
  weekly_target_hours: z.number().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

module.exports = {
  UserEntity,
  registerSchema,
  loginSchema,
};
