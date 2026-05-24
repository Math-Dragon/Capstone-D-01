import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notifyMutation, getLastMutationTime, onDataChanged } from '../../src/utils/invalidation';

describe('invalidation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('notifyMutation stores timestamp and fires event', () => {
    const handler = vi.fn();
    window.addEventListener('app:dataChanged', handler);
    notifyMutation();
    expect(handler).toHaveBeenCalledTimes(1);
    const stored = localStorage.getItem('app:lastMutation');
    expect(stored).toBeTruthy();
    expect(Number(stored)).toBeGreaterThan(0);
    window.removeEventListener('app:dataChanged', handler);
  });

  it('getLastMutationTime returns 0 when no mutation', () => {
    expect(getLastMutationTime()).toBe(0);
  });

  it('getLastMutationTime returns stored timestamp', () => {
    localStorage.setItem('app:lastMutation', '12345');
    expect(getLastMutationTime()).toBe(12345);
  });

  it('onDataChanged registers and returns cleanup', () => {
    const handler = vi.fn();
    const cleanup = onDataChanged(handler);
    window.dispatchEvent(new Event('app:dataChanged'));
    expect(handler).toHaveBeenCalledTimes(1);
    cleanup();
    window.dispatchEvent(new Event('app:dataChanged'));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
