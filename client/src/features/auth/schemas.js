import { z } from 'zod';

// @deprecated — Not imported anywhere. Form validation is done inline in LoginPage/RegisterPage.
export const loginSchema = z.object({
  email: z.string().min(1, 'Email harus diisi').email('Email tidak valid'),
  password: z.string().min(1, 'Password harus diisi').min(8, 'Password minimal 8 karakter'),
});

export const registerSchema = z.object({
  email: z.string().min(1, 'Email harus diisi').email('Email tidak valid'),
  password: z.string().min(1, 'Password harus diisi').min(8, 'Password minimal 8 karakter'),
  confirmPassword: z.string().min(1, 'Konfirmasi password harus diisi'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

// @deprecated — Move to features/goals/schemas.js when needed
// export const goalSchema = z.object({ ... });
// export const taskSchema = z.object({ ... });