const { withRetry, isTransientPgError, TRANSIENT_PG_CODES } = require('../../src/utils/retry');

jest.mock('../../src/utils/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

describe('retry', () => {
  describe('isTransientPgError', () => {
    test('returns true for transient PG codes', () => {
      expect(isTransientPgError({ code: '40001' })).toBe(true);
      expect(isTransientPgError({ code: '40P01' })).toBe(true);
      expect(isTransientPgError({ code: '57P03' })).toBe(true);
    });

    test('returns false for non-transient codes', () => {
      expect(isTransientPgError({ code: '23505' })).toBe(false);
    });

    test('TRANSIENT_PG_CODES set matches expected codes', () => {
      expect(TRANSIENT_PG_CODES.has('08003')).toBe(true);
      expect(TRANSIENT_PG_CODES.has('08006')).toBe(true);
      expect(TRANSIENT_PG_CODES.has('57P01')).toBe(true);
      expect(TRANSIENT_PG_CODES.has('57P02')).toBe(true);
      expect(TRANSIENT_PG_CODES.has('E3Q8')).toBe(true);
    });
  });

  describe('withRetry', () => {
    test('returns result on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('ok');
      const result = await withRetry(fn, { maxAttempts: 3, delayMs: 0 });
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('retries and succeeds on second attempt', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce('ok');
      const result = await withRetry(fn, { maxAttempts: 3, delayMs: 0 });
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('throws after exhausting attempts', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('persistent'));
      await expect(withRetry(fn, { maxAttempts: 2, delayMs: 0 })).rejects.toThrow('persistent');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('does not retry when shouldRetry returns false', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('no-retry'));
      await expect(
        withRetry(fn, { maxAttempts: 3, delayMs: 0, shouldRetry: () => false }),
      ).rejects.toThrow('no-retry');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('retries when shouldRetry returns true', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('retry-me'))
        .mockResolvedValueOnce('recovered');
      const result = await withRetry(fn, {
        maxAttempts: 3,
        delayMs: 0,
        shouldRetry: () => true,
      });
      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('passes attempt number to fn', async () => {
      const attempts = [];
      const fn = jest.fn().mockImplementation(async (attempt) => {
        attempts.push(attempt);
        if (attempt === 1) throw new Error('fail');
        return 'ok';
      });
      await withRetry(fn, { maxAttempts: 3, delayMs: 0 });
      expect(attempts).toEqual([1, 2]);
    });

    test('uses default options when none provided', async () => {
      const fn = jest.fn().mockResolvedValue('default');
      const result = await withRetry(fn);
      expect(result).toBe('default');
    });
  });
});
