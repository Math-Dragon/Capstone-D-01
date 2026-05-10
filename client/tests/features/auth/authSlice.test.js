import { describe, it, expect } from 'vitest';
import authReducer, { setUser, setLoading, setError, logout } from '../../../src/store/slices/authSlice';

describe('authSlice', () => {
  const initialState = {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  };

  it('should return initial state', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setUser with user data', () => {
    const user = { id: 1, email: 'test@example.com' };
    const actual = authReducer(initialState, setUser(user));
    expect(actual.user).toEqual(user);
    expect(actual.isAuthenticated).toBe(true);
  });

  it('should handle setUser with null', () => {
    const state = { ...initialState, user: { id: 1 }, isAuthenticated: true };
    const actual = authReducer(state, setUser(null));
    expect(actual.user).toBeNull();
    expect(actual.isAuthenticated).toBe(false);
  });

  it('should handle setLoading', () => {
    const actual = authReducer(initialState, setLoading(true));
    expect(actual.loading).toBe(true);
  });

  it('should handle setError', () => {
    const actual = authReducer(initialState, setError('Login failed'));
    expect(actual.error).toBe('Login failed');
  });

  it('should handle logout', () => {
    const state = {
      user: { id: 1, email: 'test@example.com' },
      isAuthenticated: true,
      loading: false,
      error: null,
    };
    const actual = authReducer(state, logout());
    expect(actual.user).toBeNull();
    expect(actual.isAuthenticated).toBe(false);
  });
});
