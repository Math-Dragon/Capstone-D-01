import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email harus diisi').email('Email tidak valid'),
  password: z.string().min(1, 'Password harus diisi').min(8, 'Password minimal 8 karakter'),
});

export const registerSchema = z.object({
  email: z.string().min(1, 'Email harus diisi').email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Harus mengandung huruf kapital')
    .regex(/[a-z]/, 'Harus mengandung huruf kecil')
    .regex(/\d/, 'Harus mengandung angka'),
  confirmPassword: z.string().min(1, 'Konfirmasi password harus diisi'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

const passwordRule = z.string().min(8, 'Password minimal 8 karakter')
  .regex(/[A-Z]/, 'Harus mengandung huruf kapital')
  .regex(/[a-z]/, 'Harus mengandung huruf kecil')
  .regex(/\d/, 'Harus mengandung angka');

const channelEnum = z.enum(['email', 'sms'], {
  errorMap: () => ({ message: 'Channel harus email atau sms' }),
});

const phoneRule = z.string().min(8, 'Nomor telepon minimal 8 karakter')
  .regex(/^\+[1-9]\d{7,14}$/, 'Format harus E.164, contoh: +6281234567890');

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Email atau nomor telepon harus diisi'),
  channel: channelEnum,
});

export const verifyOtpSchema = z.object({
  otp: z.string().min(1, 'Kode OTP harus diisi').regex(/^\d{6}$/, 'Kode OTP harus 6 digit angka'),
});

export const resetPasswordSchema = z.object({
  password: passwordRule,
  confirmPassword: z.string().min(1, 'Konfirmasi password harus diisi'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

export const phoneVerifyRequestSchema = z.object({
  phoneNumber: phoneRule,
});

export const phoneVerifyConfirmSchema = z.object({
  phoneNumber: phoneRule,
  otp: z.string().min(1, 'Kode OTP harus diisi').regex(/^\d{6}$/, 'Kode OTP harus 6 digit angka'),
});