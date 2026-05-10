import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { lockScroll, unlockScroll, resetScrollLock } from '../../src/utils/scrollLock';

describe('scrollLock', () => {
  beforeEach(() => {
    resetScrollLock();
  });

  it('locks scroll on first call', () => {
    lockScroll();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('does not double-lock', () => {
    lockScroll();
    lockScroll();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('unlocks when count reaches zero', () => {
    lockScroll();
    lockScroll();
    unlockScroll();
    expect(document.body.style.overflow).toBe('hidden');
    unlockScroll();
    expect(document.body.style.overflow).toBe('');
  });

  it('does not go below zero', () => {
    unlockScroll();
    unlockScroll();
    expect(document.body.style.overflow).toBe('');
  });

  it('resetScrollLock clears everything', () => {
    lockScroll();
    lockScroll();
    resetScrollLock();
    expect(document.body.style.overflow).toBe('');
  });
});
