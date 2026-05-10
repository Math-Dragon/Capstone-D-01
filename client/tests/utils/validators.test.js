import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateRequired,
  validateMinLength,
  validateMaxLength,
} from '../../src/utils/validators';

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co.id')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('')).toBe(false);
    expect(validateEmail('not-email')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts passwords >= 8 chars', () => {
    expect(validatePassword('12345678')).toBe(true);
    expect(validatePassword('a'.repeat(20))).toBe(true);
  });

  it('rejects passwords < 8 chars', () => {
    expect(validatePassword('1234567')).toBe(false);
    expect(validatePassword('')).toBe(false);
  });
});

describe('validateRequired', () => {
  it('accepts non-empty values', () => {
    expect(validateRequired('hello')).toBe(true);
    expect(validateRequired('0')).toBe(true);
  });

  it('rejects null/undefined/empty', () => {
    expect(validateRequired(null)).toBe(false);
    expect(validateRequired(undefined)).toBe(false);
    expect(validateRequired('')).toBe(false);
    expect(validateRequired('   ')).toBe(false);
  });
});

describe('validateMinLength', () => {
  it('accepts values at or above min', () => {
    expect(validateMinLength('abc', 3)).toBe(true);
    expect(validateMinLength('abcd', 3)).toBe(true);
  });

  it('rejects values below min', () => {
    expect(validateMinLength('ab', 3)).toBe(false);
  });
});

describe('validateMaxLength', () => {
  it('accepts values at or below max', () => {
    expect(validateMaxLength('abc', 5)).toBe(true);
    expect(validateMaxLength('abcde', 5)).toBe(true);
  });

  it('rejects values above max', () => {
    expect(validateMaxLength('abcdef', 5)).toBe(false);
  });
});
