import { z } from 'zod';

// @deprecated — Not imported anywhere. Goal validation is handled inline.
export const goalSchema = z.object({
  title: z.string().min(1, 'Judul harus diisi').max(200, 'Judul terlalu panjang'),
  description: z.string().max(1000, 'Deskripsi terlalu panjang').optional(),
  deadline: z.string().optional(),
});