import { describe, it, expect } from 'vitest';
import { goalSchema } from '../../../src/features/goals/schemas';

describe('goalSchema', () => {
  it('accepts valid goal with all fields', () => {
    const result = goalSchema.safeParse({ title: 'Learn React', description: 'desc', deadline: '2026-06-01' });
    expect(result.success).toBe(true);
  });

  it('accepts goal with only title', () => {
    const result = goalSchema.safeParse({ title: 'Learn React' });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = goalSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title over 200 chars', () => {
    const result = goalSchema.safeParse({ title: 'a'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects description over 1000 chars', () => {
    const result = goalSchema.safeParse({ title: 'Test', description: 'a'.repeat(1001) });
    expect(result.success).toBe(false);
  });

  it('accepts optional fields as undefined', () => {
    const result = goalSchema.safeParse({ title: 'Test' });
    expect(result.success).toBe(true);
  });
});
