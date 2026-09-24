const { z } = require('zod');

const passwordRule = z.string().min(8)
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/\d/, 'Must contain a number');

const channelEnum = z.enum(['email', 'sms']);

const requestPasswordResetSchema = z.object({
  identifier: z.string().min(1),
  channel: channelEnum,
});

const requestLoginOtpSchema = z.object({
  email: z.string().min(1).email(),
});

const verifyPasswordResetOtpSchema = z.object({
  identifier: z.string().min(1),
  channel: channelEnum,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1),
  password: passwordRule,
});

const requestPhoneVerifySchema = z.object({
  phoneNumber: z.string().min(8).regex(/^\+[1-9]\d{7,14}$/, 'Phone must be E.164 format'),
});

const verifyPhoneSchema = z.object({
  phoneNumber: z.string().min(8).regex(/^\+[1-9]\d{7,14}$/, 'Phone must be E.164 format'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

module.exports = {
  requestPasswordResetSchema,
  requestLoginOtpSchema,
  verifyPasswordResetOtpSchema,
  resetPasswordSchema,
  requestPhoneVerifySchema,
  verifyPhoneSchema,
};
