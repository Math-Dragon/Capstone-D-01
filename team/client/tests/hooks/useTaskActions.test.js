import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useTaskActions from '../../src/hooks/useTaskActions';

const mockAddToast = vi.fn();
const mockDispatchTaskAction = vi.fn();

vi.mock('../../src/features/coach/hooks/useCoach', () => ({
  useCoach: () => ({ dispatchTaskAction: mockDispatchTaskAction }),
}));

vi.mock('../../src/components/ui/Toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('../../src/services/api', () => ({
  default: {
    patch: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('../../src/features/coach/services/coachService', () => ({
  default: { acceptProposal: vi.fn() },
}));

vi.mock('../../src/utils/invalidation', () => ({
  notifyMutation: vi.fn(),
}));

const mockOnUpdateTasks = vi.fn();
const mockRefreshData = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTaskActions', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useTaskActions({
      onUpdateTasks: mockOnUpdateTasks,
      refreshData: mockRefreshData,
    }));

    expect(result.current.activeModal).toBeNull();
    expect(result.current.activeTask).toBeNull();
    expect(result.current.actionLoading).toBeNull();
    expect(result.current.proposal).toBeNull();
    expect(result.current.proposalAccepting).toBe(false);
  });

  it('opens skip modal on handleSkip', () => {
    const task = { id: 't1', title: 'Test' };
    const { result } = renderHook(() => useTaskActions({
      onUpdateTasks: mockOnUpdateTasks,
      refreshData: mockRefreshData,
    }));

    act(() => result.current.handleSkip(task));

    expect(result.current.activeModal).toBe('skip');
    expect(result.current.activeTask).toEqual(task);
  });

  it('opens modify modal on handleModify', () => {
    const task = { id: 't1', title: 'Test' };
    const { result } = renderHook(() => useTaskActions({
      onUpdateTasks: mockOnUpdateTasks,
      refreshData: mockRefreshData,
    }));

    act(() => result.current.handleModify(task));

    expect(result.current.activeModal).toBe('modify');
    expect(result.current.activeTask).toEqual(task);
  });

  it('closes modal on closeModal', () => {
    const { result } = renderHook(() => useTaskActions({
      onUpdateTasks: mockOnUpdateTasks,
      refreshData: mockRefreshData,
    }));

    act(() => result.current.closeModal());

    expect(result.current.activeModal).toBeNull();
    expect(result.current.activeTask).toBeNull();
  });

  it('rejects proposal with rejectProposal', () => {
    const { result } = renderHook(() => useTaskActions({
      onUpdateTasks: mockOnUpdateTasks,
      refreshData: mockRefreshData,
    }));

    act(() => result.current.rejectProposal());

    expect(result.current.proposal).toBeNull();
  });
});
