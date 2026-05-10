import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from '../../../src/features/auth/schemas';

describe('auth schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid login', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: '12345678' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = loginSchema.safeParse({ email: 'not-email', password: '12345678' });
      expect(result.success).toBe(false);
    });

    it('rejects empty email', () => {
      const result = loginSchema.safeParse({ email: '', password: '12345678' });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: '1234567' });
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('accepts valid registration', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: '12345678',
        confirmPassword: '12345678',
      });
      expect(result.success).toBe(true);
    });

    it('rejects mismatched passwords', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: '12345678',
        confirmPassword: 'different',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing confirmPassword', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        password: '12345678',
      });
      expect(result.success).toBe(false);
    });
  });
});
