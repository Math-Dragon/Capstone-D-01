import { describe, it, expect } from 'vitest';
import { isDone, formatDate, formatDuration, getErrorMessage, debounce } from '../../src/utils/helpers';

describe('isDone', () => {
  it('returns true for "done"', () => {
    expect(isDone('done')).toBe(true);
  });

  it('returns true for "completed"', () => {
    expect(isDone('completed')).toBe(true);
  });

  it('returns false for other statuses', () => {
    expect(isDone('todo')).toBe(false);
    expect(isDone('in_progress')).toBe(false);
    expect(isDone('skipped')).toBe(false);
    expect(isDone('')).toBe(false);
  });
});

describe('formatDate', () => {
  it('formats date in Indonesian locale', () => {
    const result = formatDate('2026-05-08');
    expect(result).toContain('Mei');
    expect(result).toContain('2026');
    expect(result).toContain('8');
  });
});

describe('formatDuration', () => {
  it('returns minutes only for < 60', () => {
    expect(formatDuration(45)).toBe('45 menit');
  });

  it('returns hours for exact hour', () => {
    expect(formatDuration(120)).toBe('2 jam');
  });

  it('returns hours and minutes for mixed', () => {
    expect(formatDuration(90)).toBe('1j 30m');
  });
});

describe('getErrorMessage', () => {
  it('returns response message when available', () => {
    const error = { response: { data: { message: 'Invalid input' } } };
    expect(getErrorMessage(error)).toBe('Invalid input');
  });

  it('returns error.message as fallback', () => {
    const error = new Error('Something broke');
    expect(getErrorMessage(error)).toBe('Something broke');
  });

  it('returns default message for unknown errors', () => {
    expect(getErrorMessage({})).toBe('Terjadi kesalahan yang tidak terduga');
  });
});

describe('debounce', () => {
  it('calls function after delay', async () => {
    let callCount = 0;
    const fn = debounce(() => { callCount++; }, 50);
    fn();
    fn();
    fn();
    expect(callCount).toBe(0);
    await new Promise(r => setTimeout(r, 100));
    expect(callCount).toBe(1);
  });
});
