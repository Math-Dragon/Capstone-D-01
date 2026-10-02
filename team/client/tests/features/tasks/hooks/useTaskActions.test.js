import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useTaskActions from '../../../../src/features/tasks/hooks/useTaskActions';
import proposalService from '../../../../src/features/coach/services/proposalService';

const mockAddToast = vi.fn();
const mockDispatchTaskAction = vi.fn();

vi.mock('../../../../src/features/coach/hooks/useCoach', () => ({
  useCoach: () => ({ dispatchTaskAction: mockDispatchTaskAction }),
}));

vi.mock('../../../../src/components/ui/Toast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('../../../../src/services/api', () => ({
  default: {
    patch: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('../../../../src/features/coach/services/coachService', () => ({
  default: { acceptProposal: vi.fn() },
}));

vi.mock('../../../../src/features/coach/services/proposalService', () => ({
  default: {
    getPending: vi.fn(),
    getById: vi.fn(),
    accept: vi.fn(),
    reject: vi.fn(),
    newIdempotencyKey: vi.fn(() => 'idem_fixed_key'),
  },
}));

vi.mock('../../../../src/utils/invalidation', () => ({
  notifyMutation: vi.fn(),
}));

const mockOnUpdateTasks = vi.fn();
const mockRefreshData = vi.fn();

function renderActions() {
  return renderHook(() => useTaskActions({
    onUpdateTasks: mockOnUpdateTasks,
    refreshData: mockRefreshData,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  proposalService.newIdempotencyKey.mockReturnValue('idem_fixed_key');
  proposalService.getPending.mockResolvedValue(null);
});

describe('useTaskActions', () => {
  it('returns initial state', async () => {
    const { result } = renderActions();

    expect(result.current.activeModal).toBeNull();
    expect(result.current.activeTask).toBeNull();
    expect(result.current.actionLoading).toBeNull();
    expect(result.current.proposal).toBeNull();
    expect(result.current.proposalAccepting).toBe(false);
    expect(result.current.proposalRejecting).toBe(false);
    expect(result.current.proposalError).toBeNull();
    await waitFor(() => expect(proposalService.getPending).toHaveBeenCalled());
  });

  it('loads the pending proposal from the server on mount', async () => {
    const pending = { id: 'p-1', summary: 'Menyesuaikan', base_plan_version: 'snap-1' };
    proposalService.getPending.mockResolvedValue(pending);

    const { result } = renderActions();

    await waitFor(() => expect(result.current.proposal).toEqual(pending));
    expect(proposalService.getPending).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('pendingProposal')).toBeNull();
  });

  it('opens skip modal on handleSkip', () => {
    const task = { id: 't1', title: 'Test' };
    const { result } = renderActions();

    act(() => result.current.handleSkip(task));

    expect(result.current.activeModal).toBe('skip');
    expect(result.current.activeTask).toEqual(task);
  });

  it('opens modify modal on handleModify', () => {
    const task = { id: 't1', title: 'Test' };
    const { result } = renderActions();

    act(() => result.current.handleModify(task));

    expect(result.current.activeModal).toBe('modify');
    expect(result.current.activeTask).toEqual(task);
  });

  it('closes modal on closeModal', () => {
    const { result } = renderActions();

    act(() => result.current.closeModal());

    expect(result.current.activeModal).toBeNull();
    expect(result.current.activeTask).toBeNull();
  });

  it('fetches proposal detail when dispatch returns a proposal id', async () => {
    proposalService.getById.mockResolvedValue({
      id: 'p-9',
      summary: 'Adaptasi',
      base_plan_version: 'snap-9',
      changes: { added: [], modified: [], removed: [], rescheduled: [] },
    });
    mockDispatchTaskAction.mockResolvedValue({ proposal: { id: 'p-9' } });

    const { result } = renderActions();
    await waitFor(() => expect(proposalService.getPending).toHaveBeenCalled());

    act(() => result.current.handleFeedback({ id: 't1', title: 'Test' }));
    await act(async () => { await result.current.submitFeedback('hard', 'focus', 'notes'); });

    await waitFor(() => expect(proposalService.getById).toHaveBeenCalledWith('p-9'));
    expect(result.current.proposal?.id).toBe('p-9');
    expect(result.current.proposal?.base_plan_version).toBe('snap-9');
  });

  it('does not build a proposal from result.plan or localStorage', async () => {
    mockDispatchTaskAction.mockResolvedValue({
      plan: { summary: 'Legacy plan', tasks: [{ id: 'x', title: 'Legacy' }] },
    });

    const { result } = renderActions();
    await waitFor(() => expect(proposalService.getPending).toHaveBeenCalled());

    act(() => result.current.handleFeedback({ id: 't1', title: 'Test' }));
    await act(async () => { await result.current.submitFeedback('hard', 'focus', 'notes'); });

    await waitFor(() => expect(proposalService.getPending).toHaveBeenCalledTimes(2));
    expect(result.current.proposal).toBeNull();
    expect(localStorage.getItem('pendingProposal')).toBeNull();
  });

  it('accepts the proposal with base plan version and idempotency key', async () => {
    proposalService.getById.mockResolvedValue({
      id: 'p-2',
      summary: 'Adaptasi',
      base_plan_version: 'snap-2',
    });
    mockDispatchTaskAction.mockResolvedValue({ proposal: { id: 'p-2' } });
    proposalService.accept.mockResolvedValue({ status: 'accepted', task_count: 3, summary: 'ok' });

    const { result } = renderActions();
    await waitFor(() => expect(proposalService.getPending).toHaveBeenCalled());

    act(() => result.current.handleFeedback({ id: 't1', title: 'Test' }));
    await act(async () => { await result.current.submitFeedback('hard', 'focus', 'notes'); });
    await waitFor(() => expect(result.current.proposal?.id).toBe('p-2'));

    await act(async () => { await result.current.acceptProposal(); });

    expect(proposalService.accept).toHaveBeenCalledWith('p-2', {
      basePlanVersion: 'snap-2',
      idempotencyKey: 'idem_fixed_key',
    });
    expect(mockRefreshData).toHaveBeenCalled();
    expect(mockAddToast).toHaveBeenCalledWith('Rencana baru disimpan!', 'success');
    expect(result.current.proposal).toBeNull();
    expect(result.current.proposalAccepting).toBe(false);
  });

  it('shows a stale toast and reloads when accept fails with PROPOSAL_STALE', async () => {
    proposalService.getById.mockResolvedValue({ id: 'p-3', summary: 'a', base_plan_version: 'snap-3' });
    mockDispatchTaskAction.mockResolvedValue({ proposal: { id: 'p-3' } });
    proposalService.accept.mockRejectedValue(Object.assign(new Error('stale'), { code: 'PROPOSAL_STALE' }));

    const { result } = renderActions();
    await waitFor(() => expect(proposalService.getPending).toHaveBeenCalled());
    act(() => result.current.handleFeedback({ id: 't1', title: 'Test' }));
    await act(async () => { await result.current.submitFeedback('hard', 'focus', 'notes'); });
    await waitFor(() => expect(result.current.proposal?.id).toBe('p-3'));

    await act(async () => { await result.current.acceptProposal(); });

    expect(mockAddToast).toHaveBeenCalledWith('Rencana telah berubah, muat ulang.', 'warning');
    expect(proposalService.getPending).toHaveBeenCalledTimes(2);
    expect(result.current.proposalError).toBeNull();
  });

  it('clears the proposal when accept fails with PROPOSAL_EXPIRED', async () => {
    proposalService.getById.mockResolvedValue({ id: 'p-4', summary: 'a', base_plan_version: 'snap-4' });
    mockDispatchTaskAction.mockResolvedValue({ proposal: { id: 'p-4' } });
    proposalService.accept.mockRejectedValue(Object.assign(new Error('expired'), { code: 'PROPOSAL_EXPIRED' }));

    const { result } = renderActions();
    await waitFor(() => expect(proposalService.getPending).toHaveBeenCalled());
    act(() => result.current.handleFeedback({ id: 't1', title: 'Test' }));
    await act(async () => { await result.current.submitFeedback('hard', 'focus', 'notes'); });
    await waitFor(() => expect(result.current.proposal?.id).toBe('p-4'));

    await act(async () => { await result.current.acceptProposal(); });

    expect(mockAddToast).toHaveBeenCalledWith('Proposal kedaluwarsa.', 'warning');
    expect(result.current.proposal).toBeNull();
  });

  it('exposes an inline error when accept fails otherwise', async () => {
    proposalService.getById.mockResolvedValue({ id: 'p-5', summary: 'a', base_plan_version: 'snap-5' });
    mockDispatchTaskAction.mockResolvedValue({ proposal: { id: 'p-5' } });
    proposalService.accept.mockRejectedValue(new Error('Gagal menyimpan rencana. Coba lagi.'));

    const { result } = renderActions();
    await waitFor(() => expect(proposalService.getPending).toHaveBeenCalled());
    act(() => result.current.handleFeedback({ id: 't1', title: 'Test' }));
    await act(async () => { await result.current.submitFeedback('hard', 'focus', 'notes'); });
    await waitFor(() => expect(result.current.proposal?.id).toBe('p-5'));

    await act(async () => { await result.current.acceptProposal(); });

    expect(result.current.proposalError).toBe('Gagal menyimpan rencana. Coba lagi.');
    expect(result.current.proposalAccepting).toBe(false);
  });

  it('rejects the proposal through the server', async () => {
    proposalService.getById.mockResolvedValue({ id: 'p-6', summary: 'a', base_plan_version: 'snap-6' });
    mockDispatchTaskAction.mockResolvedValue({ proposal: { id: 'p-6' } });
    proposalService.reject.mockResolvedValue({ status: 'rejected' });

    const { result } = renderActions();
    await waitFor(() => expect(proposalService.getPending).toHaveBeenCalled());
    act(() => result.current.handleFeedback({ id: 't1', title: 'Test' }));
    await act(async () => { await result.current.submitFeedback('hard', 'focus', 'notes'); });
    await waitFor(() => expect(result.current.proposal?.id).toBe('p-6'));

    await act(async () => { await result.current.rejectProposal(); });

    expect(proposalService.reject).toHaveBeenCalledWith('p-6', { idempotencyKey: 'idem_fixed_key' });
    expect(result.current.proposal).toBeNull();
    expect(result.current.proposalRejecting).toBe(false);
    expect(mockAddToast).toHaveBeenCalledWith('Proposal ditolak.', 'info');
  });

  it('rejects nothing when there is no proposal', async () => {
    const { result } = renderActions();
    await waitFor(() => expect(proposalService.getPending).toHaveBeenCalled());

    await act(async () => { await result.current.rejectProposal(); });

    expect(proposalService.reject).not.toHaveBeenCalled();
    expect(result.current.proposal).toBeNull();
  });

  it('dismissProposal only closes the view without calling the server', async () => {
    proposalService.getPending.mockResolvedValue({ id: 'p-7', summary: 'a' });
    const { result } = renderActions();
    await waitFor(() => expect(result.current.proposal?.id).toBe('p-7'));

    act(() => result.current.dismissProposal());

    expect(result.current.proposal).toBeNull();
    expect(proposalService.reject).not.toHaveBeenCalled();
    expect(proposalService.accept).not.toHaveBeenCalled();
  });
});
