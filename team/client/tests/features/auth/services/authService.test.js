import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import api from '../../../../src/services/api';
import { authService } from '../../../../src/features/auth/services/authService';

describe('authService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('login calls api.post with credentials', async () => {
    api.post.mockResolvedValue({ accessToken: 'tok' });
    const result = await authService.login({ email: 'a@b.com', password: 'pass' });
    expect(api.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'pass' });
    expect(result).toEqual({ accessToken: 'tok' });
  });

  it('register calls api.post with userData', async () => {
    api.post.mockResolvedValue({ id: '1' });
    const result = await authService.register({ email: 'a@b.com', password: 'pass' });
    expect(api.post).toHaveBeenCalledWith('/auth/register', { email: 'a@b.com', password: 'pass' });
    expect(result).toEqual({ id: '1' });
  });

  it('logout calls api.post and removes token', async () => {
    api.post.mockResolvedValue({});
    const spy = vi.spyOn(Storage.prototype, 'removeItem');
    await authService.logout();
    expect(api.post).toHaveBeenCalledWith('/auth/logout');
    expect(spy).toHaveBeenCalledWith('token');
    spy.mockRestore();
  });

  it('logout still removes token on api failure', async () => {
    api.post.mockRejectedValue(new Error('fail'));
    const spy = vi.spyOn(Storage.prototype, 'removeItem');
    await expect(authService.logout()).rejects.toThrow('fail');
    expect(spy).toHaveBeenCalledWith('token');
    spy.mockRestore();
  });

  it('refreshToken calls api.post', async () => {
    api.post.mockResolvedValue({ accessToken: 'new' });
    const result = await authService.refreshToken();
    expect(api.post).toHaveBeenCalledWith('/auth/refresh');
    expect(result).toEqual({ accessToken: 'new' });
  });

  it('getProfile calls api.get', async () => {
    api.get.mockResolvedValue({ id: '1', email: 'a@b.com' });
    const result = await authService.getProfile();
    expect(api.get).toHaveBeenCalledWith('/auth/me');
    expect(result).toEqual({ id: '1', email: 'a@b.com' });
  });
});
