import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email harus diisi').email('Email tidak valid'),
  password: z.string().min(1, 'Password harus diisi').min(6, 'Password minimal 6 karakter'),
});

export const registerSchema = z.object({
  email: z.string().min(1, 'Email harus diisi').email('Email tidak valid'),
  password: z.string().min(1, 'Password harus diisi').min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string().min(1, 'Konfirmasi password harus diisi'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password tidak cocok',
  path: ['confirmPassword'],
});

export const goalSchema = z.object({
  title: z.string().min(1, 'Judul harus diisi').max(200, 'Judul terlalu panjang'),
  description: z.string().max(1000, 'Deskripsi terlalu panjang').optional(),
  deadline: z.string().optional(),
});

export const taskSchema = z.object({
  title: z.string().min(1, 'Judul harus diisi').max(200),
  description: z.string().max(1000).optional(),
  duration_estimate: z.number().min(15).max(180).optional(),
  planned_date: z.string().optional(),
  planned_slot: z.enum(['morning', 'afternoon', 'evening']).optional(),
});