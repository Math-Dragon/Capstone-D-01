jest.mock('../../src/repositories', () => ({
  goal: {
    list: jest.fn(),
    findByIdAndUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
  task: {
    countByGoalIds: jest.fn(),
    findByGoalId: jest.fn(),
  },
}));

const repos = require('../../src/repositories');
const goalService = require('../../src/services/goal.service');

beforeEach(() => jest.clearAllMocks());

describe('goalService.list', () => {
  test('returns goals with task stats', async () => {
    const goals = [{ id: 'g1' }, { id: 'g2' }];
    repos.goal.list.mockResolvedValue(goals);
    repos.task.countByGoalIds.mockResolvedValue({
      g1: { total: 5, completed: 3 },
      g2: { total: 2, completed: 1 },
    });

    const result = await goalService.list('u1');
    expect(result[0].task_total).toBe(5);
    expect(result[0].task_completed).toBe(3);
    expect(result[1].task_total).toBe(2);
    expect(result[1].task_completed).toBe(1);
  });

  test('returns goals without task stats when empty', async () => {
    repos.goal.list.mockResolvedValue([]);
    const result = await goalService.list('u1');
    expect(result).toEqual([]);
    expect(repos.task.countByGoalIds).not.toHaveBeenCalled();
  });

  test('uses default stats when goal id missing from stats', async () => {
    repos.goal.list.mockResolvedValue([{ id: 'g1' }]);
    repos.task.countByGoalIds.mockResolvedValue({});

    const result = await goalService.list('u1');
    expect(result[0].task_total).toBe(0);
    expect(result[0].task_completed).toBe(0);
  });
});

describe('goalService.create', () => {
  test('creates goal with userId', async () => {
    const row = { id: 'g1', user_id: 'u1', title: 'Goal' };
    repos.goal.create.mockResolvedValue(row);
    const result = await goalService.create('u1', { title: 'Goal' });
    expect(result).toEqual(row);
    expect(repos.goal.create).toHaveBeenCalledWith({ user_id: 'u1', title: 'Goal' });
  });
});

describe('goalService.getById', () => {
  test('throws 404 when goal not found', async () => {
    repos.goal.findByIdAndUserId.mockResolvedValue(null);
    await expect(goalService.getById('u1', 'g1'))
      .rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  test('returns goal with tasks', async () => {
    repos.goal.findByIdAndUserId.mockResolvedValue({ id: 'g1' });
    repos.task.findByGoalId.mockResolvedValue([{ id: 't1' }]);

    const result = await goalService.getById('u1', 'g1');
    expect(result.tasks).toEqual([{ id: 't1' }]);
  });
});

describe('goalService.update', () => {
  test('updates after verifying ownership', async () => {
    repos.goal.findByIdAndUserId.mockResolvedValue({ id: 'g1' });
    repos.goal.update.mockResolvedValue({ id: 'g1', title: 'Updated' });

    const result = await goalService.update('u1', 'g1', { title: 'Updated' });
    expect(result).toEqual({ id: 'g1', title: 'Updated' });
  });

  test('throws 404 when goal not found', async () => {
    repos.goal.findByIdAndUserId.mockResolvedValue(null);
    await expect(goalService.update('u1', 'g1', { title: 'X' }))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('goalService.delete', () => {
  test('deletes after verifying ownership', async () => {
    repos.goal.findByIdAndUserId.mockResolvedValue({ id: 'g1' });
    repos.goal.remove.mockResolvedValue(true);
    const result = await goalService.delete('u1', 'g1');
    expect(result).toBe(true);
  });

  test('throws 404 when goal not found', async () => {
    repos.goal.findByIdAndUserId.mockResolvedValue(null);
    await expect(goalService.delete('u1', 'g1'))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});
