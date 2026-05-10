jest.mock('../../src/db', () => ({
  withTransaction: jest.fn((fn) => fn({ query: jest.fn() })),
  query: jest.fn(),
}));

jest.mock('../../src/repositories', () => ({
  goal: { list: jest.fn(), create: jest.fn() },
  task: { createMany: jest.fn(), findActiveByUser: jest.fn(), remove: jest.fn(), update: jest.fn() },
  aiRec: { create: jest.fn() },
  planSnapshot: { findLatest: jest.fn(), remove: jest.fn() },
  audit: { create: jest.fn() },
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const db = require('../../src/db');
const repos = require('../../src/repositories');
const {
  persistPlan,
  stageRecommendation,
  acceptProposal,
  undoPlan,
} = require('../../src/services/coach/response-formatter.service');

beforeEach(() => jest.clearAllMocks());

describe('persistPlan', () => {
  test('skips when plan is null', async () => {
    await persistPlan('u1', null, 'g1');
    expect(db.withTransaction).not.toHaveBeenCalled();
  });

  test('skips when plan has no tasks', async () => {
    await persistPlan('u1', { tasks: [] }, 'g1');
    expect(db.withTransaction).not.toHaveBeenCalled();
  });

  test('persists with given goalId', async () => {
    repos.task.createMany.mockResolvedValue([{ id: 't1' }]);
    await persistPlan('u1', { tasks: [{ title: 'Task 1', duration_estimate: 30 }] }, 'g1');
    expect(db.withTransaction).toHaveBeenCalled();
    expect(repos.task.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ goal_id: 'g1', source: 'coach' })]),
      expect.anything(),
    );
  });

  test('finds active goal when no goalId provided', async () => {
    repos.goal.list.mockResolvedValue([{ id: 'auto-goal' }]);
    repos.task.createMany.mockResolvedValue([]);
    await persistPlan('u1', { tasks: [{ title: 'T', duration_estimate: 30 }] });
    expect(repos.goal.list).toHaveBeenCalledWith('u1', {}, expect.anything());
    expect(repos.task.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ goal_id: 'auto-goal' })]),
      expect.anything(),
    );
  });

  test('skips when no active goal found and no goalId', async () => {
    repos.goal.list.mockResolvedValue([]);
    await persistPlan('u1', { tasks: [{ title: 'T', duration_estimate: 30 }] });
    expect(repos.task.createMany).not.toHaveBeenCalled();
  });
});

describe('stageRecommendation', () => {
  test('creates goal and recommendation', async () => {
    repos.goal.create.mockResolvedValue({ id: 'g1' });
    repos.aiRec.create.mockResolvedValue({ id: 'rec1' });

    const result = await stageRecommendation('u1', { tasks: [{ title: 'T' }], summary: 'Plan' }, {
      payload: { goal: { title: 'Learn JS' }, profile: {} },
    });

    expect(repos.goal.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'u1', title: 'Learn JS', status: 'active',
    }));
    expect(repos.aiRec.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'u1', type: 'coach_plan', status: 'pending',
    }));
    expect(result.id).toBe('rec1');
  });

  test('uses default title when goal not provided', async () => {
    repos.goal.create.mockResolvedValue({ id: 'g1' });
    repos.aiRec.create.mockResolvedValue({ id: 'rec1' });

    await stageRecommendation('u1', { tasks: [], summary: '' }, { payload: {} });
    expect(repos.goal.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Rencana Belajar',
    }));
  });
});

describe('acceptProposal', () => {
  test('returns message when no plan', async () => {
    const result = await acceptProposal('u1', { plan: null }, 's1');
    expect(result.type).toBe('message');
    expect(result.data.message).toContain('Tidak ada');
  });

  test('returns message when plan has no tasks', async () => {
    const result = await acceptProposal('u1', { plan: { tasks: [] } }, 's1');
    expect(result.type).toBe('message');
  });

  test('persists and returns accepted', async () => {
    repos.task.createMany.mockResolvedValue([]);
    repos.audit.create.mockResolvedValue({});

    const result = await acceptProposal('u1', { plan: { tasks: [{ title: 'T', duration_estimate: 30 }], summary: 'S' } }, 's1');
    expect(result.type).toBe('accepted');
    expect(repos.audit.create).toHaveBeenCalled();
  });
});

describe('undoPlan', () => {
  test('returns message when no snapshot', async () => {
    repos.planSnapshot.findLatest.mockResolvedValue(null);
    const result = await undoPlan('u1', 's1');
    expect(result.type).toBe('message');
    expect(result.data.message).toContain('Tidak ada');
  });

  test('undoes plan from snapshot', async () => {
    const snapshot = {
      id: 'snap1',
      trigger_id: 'trig1',
      adaptation_type: 'crisis',
      tasks_snapshot: [
        { id: 't1' },
        { id: 't2' },
      ],
    };
    repos.planSnapshot.findLatest.mockResolvedValue(snapshot);
    repos.task.findActiveByUser.mockResolvedValue([{ id: 't3' }, { id: 't1' }]);
    repos.task.remove.mockResolvedValue(true);
    repos.task.update.mockResolvedValue({});
    repos.planSnapshot.remove.mockResolvedValue(true);
    repos.audit.create.mockResolvedValue({});

    const result = await undoPlan('u1', 's1');
    expect(result.type).toBe('message');
    expect(repos.task.remove).toHaveBeenCalledWith('t3', 'u1', expect.anything());
    expect(repos.task.update).toHaveBeenCalledWith('t1', { status: 'todo' }, expect.anything());
    expect(repos.task.update).toHaveBeenCalledWith('t2', { status: 'todo' }, expect.anything());
    expect(repos.planSnapshot.remove).toHaveBeenCalledWith('snap1', expect.anything());
    expect(repos.audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'COACH_PLAN_UNDONE' }),
      expect.anything(),
    );
  });
});
