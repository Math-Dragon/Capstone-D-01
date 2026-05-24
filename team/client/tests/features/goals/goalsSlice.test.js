import { describe, it, expect, vi, beforeEach } from 'vitest';
import goalsReducer, {
  fetchGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  clearGoalsError,
} from '../../../src/store/slices/goalsSlice';

vi.mock('../../../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../../../src/services/api';

describe('goalsSlice', () => {
  const initialState = { items: [], loading: false, error: null };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    expect(goalsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle clearGoalsError', () => {
    const state = { items: [], loading: false, error: 'Some error' };
    expect(goalsReducer(state, clearGoalsError()).error).toBeNull();
  });

  describe('fetchGoals', () => {
    it('should set loading on pending', () => {
      const actual = goalsReducer(initialState, { type: fetchGoals.pending });
      expect(actual.loading).toBe(true);
      expect(actual.error).toBeNull();
    });

    it('should set items on fulfilled', () => {
      const goals = [{ id: 1, title: 'Test Goal' }];
      const actual = goalsReducer(
        { ...initialState, loading: true },
        { type: fetchGoals.fulfilled, payload: goals },
      );
      expect(actual.loading).toBe(false);
      expect(actual.items).toEqual(goals);
    });

    it('should set error on rejected', () => {
      const actual = goalsReducer(
        { ...initialState, loading: true },
        { type: fetchGoals.rejected, error: { message: 'Network error' } },
      );
      expect(actual.loading).toBe(false);
      expect(actual.error).toBe('Network error');
    });
  });

  describe('createGoal', () => {
    it('should prepend new goal on fulfilled', () => {
      const existing = { items: [{ id: 1, title: 'Existing' }], loading: false, error: null };
      const newGoal = { id: 2, title: 'New Goal' };
      const actual = goalsReducer(existing, { type: createGoal.fulfilled, payload: newGoal });
      expect(actual.items).toHaveLength(2);
      expect(actual.items[0]).toEqual(newGoal);
    });
  });

  describe('updateGoal', () => {
    it('should replace matching goal on fulfilled', () => {
      const existing = {
        items: [{ id: 1, title: 'Old Title' }, { id: 2, title: 'Other' }],
        loading: false,
        error: null,
      };
      const updated = { id: 1, title: 'New Title' };
      const actual = goalsReducer(existing, { type: updateGoal.fulfilled, payload: updated });
      expect(actual.items[0].title).toBe('New Title');
      expect(actual.items[1].title).toBe('Other');
    });
  });

  describe('deleteGoal', () => {
    it('should remove matching goal on fulfilled', () => {
      const existing = {
        items: [{ id: 1, title: 'A' }, { id: 2, title: 'B' }, { id: 3, title: 'C' }],
        loading: false,
        error: null,
      };
      const actual = goalsReducer(existing, { type: deleteGoal.fulfilled, payload: 2 });
      expect(actual.items).toHaveLength(2);
      expect(actual.items.map(g => g.id)).toEqual([1, 3]);
    });
  });
});
