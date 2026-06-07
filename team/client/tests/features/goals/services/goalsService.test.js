import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../../../../src/services/api';
import { goalsService } from '../../../../src/features/goals/services/goalsService';

describe('goalsService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchAll calls api.get', async () => {
    api.get.mockResolvedValue([{ id: '1' }]);
    const result = await goalsService.fetchAll();
    expect(api.get).toHaveBeenCalledWith('/goals');
    expect(result).toEqual([{ id: '1' }]);
  });

  it('create calls api.post', async () => {
    api.post.mockResolvedValue({ id: '1', title: 'Goal' });
    const result = await goalsService.create({ title: 'Goal' });
    expect(api.post).toHaveBeenCalledWith('/goals', { title: 'Goal' });
    expect(result).toEqual({ id: '1', title: 'Goal' });
  });

  it('update calls api.patch with id', async () => {
    api.patch.mockResolvedValue({ id: '1', title: 'Updated' });
    const result = await goalsService.update({ id: '1', title: 'Updated' });
    expect(api.patch).toHaveBeenCalledWith('/goals/1', { title: 'Updated' });
    expect(result).toEqual({ id: '1', title: 'Updated' });
  });

  it('delete calls api.delete and returns id', async () => {
    api.delete.mockResolvedValue({});
    const result = await goalsService.delete('1');
    expect(api.delete).toHaveBeenCalledWith('/goals/1');
    expect(result).toBe('1');
  });
});
