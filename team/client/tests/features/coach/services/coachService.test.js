import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/services/api', () => ({
  default: { post: vi.fn(), get: vi.fn() },
}));

import api from '../../../../src/services/api';
import { coachService, setSessionId } from '../../../../src/features/coach/services/coachService';

beforeEach(() => {
  vi.clearAllMocks();
  setSessionId(null);
});

describe('coachService', () => {
  it('dispatchAction posts to /coach with action and enriched payload', async () => {
    api.post.mockResolvedValue({ data: 'ok' });
    const result = await coachService.dispatchAction('TEST_ACTION', { key: 'val' });
    expect(api.post).toHaveBeenCalledWith('/coach', {
      action: 'TEST_ACTION',
      payload: expect.objectContaining({ key: 'val', client_timestamp: expect.any(Number) }),
    });
    expect(result).toEqual({ data: 'ok' });
  });

  it('initialPlan posts INITIAL_PLAN action', async () => {
    api.post.mockResolvedValue({ data: 'plan' });
    const result = await coachService.initialPlan({ goal: { title: 'Learn X' } });
    expect(api.post).toHaveBeenCalledWith('/coach', {
      action: 'INITIAL_PLAN',
      payload: expect.objectContaining({ goal: { title: 'Learn X' } }),
    });
    expect(result).toEqual({ data: 'plan' });
  });

  it('decideTask posts to decide endpoint', async () => {
    api.post.mockResolvedValue({ status: 'accepted' });
    const result = await coachService.decideTask('rec1', 'task1', 'accepted', { duration_estimate: 45 });
    expect(api.post).toHaveBeenCalledWith('/coach/recommendations/rec1/tasks/task1/decide', {
      decision: 'accepted',
      session_id: null,
      overrides: { duration_estimate: 45 },
    });
    expect(result).toEqual({ status: 'accepted' });
  });

  it('decideTask without overrides', async () => {
    api.post.mockResolvedValue({ status: 'rejected' });
    const result = await coachService.decideTask('rec1', 'task1', 'rejected');
    expect(api.post).toHaveBeenCalledWith('/coach/recommendations/rec1/tasks/task1/decide', {
      decision: 'rejected',
      session_id: null,
    });
    expect(result).toEqual({ status: 'rejected' });
  });

  it('sendMessage posts CHAT_MESSAGE action', async () => {
    api.post.mockResolvedValue({ message: 'Hi!' });
    const result = await coachService.sendMessage('Hello');
    expect(api.post).toHaveBeenCalledWith('/coach', {
      action: 'CHAT_MESSAGE',
      payload: { message: 'Hello' },
    });
  });

  it('checkIn posts CHECK_IN action', async () => {
    api.post.mockResolvedValue({ ok: true });
    await coachService.checkIn('good');
    expect(api.post).toHaveBeenCalledWith('/coach', {
      action: 'CHECK_IN',
      payload: { mood: 'good' },
    });
  });

  it('completeTask posts COMPLETE_TASK action', async () => {
    api.post.mockResolvedValue({ ok: true });
    await coachService.completeTask('task-123');
    expect(api.post).toHaveBeenCalledWith('/coach', {
      action: 'COMPLETE_TASK',
      payload: { taskId: 'task-123' },
    });
  });

  it('skipTask posts SKIP_TASK action', async () => {
    api.post.mockResolvedValue({ ok: true });
    await coachService.skipTask('task-123', 'too_hard');
    expect(api.post).toHaveBeenCalledWith('/coach', {
      action: 'SKIP_TASK',
      payload: { taskId: 'task-123', reason: 'too_hard' },
    });
  });

  it('submitFeedback posts SUBMIT_FEEDBACK action', async () => {
    api.post.mockResolvedValue({ ok: true });
    await coachService.submitFeedback('task-123', 4, 5, 'Great!');
    expect(api.post).toHaveBeenCalledWith('/coach', {
      action: 'SUBMIT_FEEDBACK',
      payload: { taskId: 'task-123', difficulty: 4, focus: 5, notes: 'Great!' },
    });
  });

  it('requestAdjustment posts REQUEST_ADJUSTMENT action', async () => {
    api.post.mockResolvedValue({ ok: true });
    await coachService.requestAdjustment('pace', 'Too fast');
    expect(api.post).toHaveBeenCalledWith('/coach', {
      action: 'REQUEST_ADJUSTMENT',
      payload: { type: 'pace', message: 'Too fast' },
    });
  });

  it('undoPlan posts to /coach/undo', async () => {
    api.post.mockResolvedValue({ status: 'ok' });
    const result = await coachService.undoPlan();
    expect(api.post).toHaveBeenCalledWith('/coach/undo');
    expect(result).toEqual({ status: 'ok' });
  });

  it('getHistory calls api.get with /coach/history', async () => {
    api.get.mockResolvedValue([{ id: 'm1' }]);
    const result = await coachService.getHistory();
    expect(api.get).toHaveBeenCalledWith('/coach/history');
    expect(result).toEqual([{ id: 'm1' }]);
  });

  it('getHistory returns empty array on error', async () => {
    api.get.mockRejectedValue(new Error('fail'));
    const result = await coachService.getHistory();
    expect(result).toEqual([]);
  });

  it('acceptProposal posts ACCEPT_PROPOSAL action', async () => {
    api.post.mockResolvedValue({ ok: true });
    const plan = { tasks: [], summary: 'S' };
    await coachService.acceptProposal(plan);
    expect(api.post).toHaveBeenCalledWith('/coach', {
      action: 'ACCEPT_PROPOSAL',
      payload: { plan },
    });
  });

  it('includes session_id in enrichPayload when set', async () => {
    setSessionId('test-session');
    api.post.mockResolvedValue({});
    await coachService.dispatchAction('TEST', {});
    expect(api.post).toHaveBeenCalledWith('/coach', {
      action: 'TEST',
      payload: expect.objectContaining({ session_id: 'test-session' }),
    });
  });
});
