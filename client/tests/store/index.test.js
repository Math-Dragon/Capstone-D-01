import { describe, it, expect } from 'vitest';
import { store } from '../../src/store/index';
import { setUser, logout } from '../../src/store/slices/authSlice';

describe('store', () => {
  it('has auth, goals, and observability reducers', () => {
    const state = store.getState();
    expect(state).toHaveProperty('auth');
    expect(state).toHaveProperty('goals');
    expect(state).toHaveProperty('observability');
  });

  it('dispatches setUser action', () => {
    store.dispatch(setUser({ id: '1', email: 'a@b.com' }));
    const state = store.getState();
    expect(state.auth.user).toEqual({ id: '1', email: 'a@b.com' });
    store.dispatch(logout());
  });

  it('dispatches logout action', () => {
    store.dispatch(setUser({ id: '1' }));
    store.dispatch(logout());
    const state = store.getState();
    expect(state.auth.user).toBeNull();
  });
});
