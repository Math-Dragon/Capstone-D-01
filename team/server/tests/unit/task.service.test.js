const repos = require('../../src/repositories');

jest.mock('../../src/repositories', () => ({
  goal: { findByIdAndUserId: jest.fn() },
  task: {
    create: jest.fn(),
    findByIdAndUser: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findByUserAndWeek: jest.fn(),
    listByUser: jest.fn(),
  },
  progress: { upsert: jest.fn() },
  studentMetrics: {
    findByUserId: jest.fn(),
    computeRollingMetrics: jest.fn(),
    upsert: jest.fn(),
  },
}));

const taskService = require('../../src/services/task.service');

beforeEach(() => jest.clearAllMocks());

describe('taskService.list', () => {
  test('delegates to repo', async () => {
    repos.task.listByUser.mockResolvedValue([{ id: 't1' }]);
    const result = await taskService.list('u1', { goalId: 'g1' });
    expect(result).toEqual([{ id: 't1' }]);
    expect(repos.task.listByUser).toHaveBeenCalledWith('u1', { goalId: 'g1' });
  });
});

describe('taskService.create', () => {
  test('throws 404 when goal not found', async () => {
    repos.goal.findByIdAndUserId.mockResolvedValue(null);
    await expect(taskService.create('u1', { goal_id: 'g1', title: 'T' }))
      .rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  test('creates task with source manual', async () => {
    repos.goal.findByIdAndUserId.mockResolvedValue({ id: 'g1' });
    repos.task.create.mockResolvedValue({ id: 't1', title: 'T', source: 'manual' });
    const result = await taskService.create('u1', { goal_id: 'g1', title: 'T' });
    expect(result).toEqual({ id: 't1', title: 'T', source: 'manual' });
    expect(repos.task.create).toHaveBeenCalledWith(expect.objectContaining({ source: 'manual' }));
  });
});

describe('taskService.getById', () => {
  test('throws 404 when task not found', async () => {
    repos.task.findByIdAndUser.mockResolvedValue(null);
    await expect(taskService.getById('u1', 't1'))
      .rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  test('returns task when found', async () => {
    repos.task.findByIdAndUser.mockResolvedValue({ id: 't1' });
    const result = await taskService.getById('u1', 't1');
    expect(result).toEqual({ id: 't1' });
  });
});

describe('taskService.update', () => {
  test('sets completed_at when status changes to done', async () => {
    repos.task.findByIdAndUser.mockResolvedValue({ id: 't1', status: 'todo' });
    repos.task.update.mockResolvedValue({ id: 't1', status: 'done' });
    repos.task.findByUserAndWeek.mockResolvedValue([]);
    repos.progress.upsert.mockResolvedValue({});

    const result = await taskService.update('u1', 't1', { status: 'done' });
    expect(result).toEqual({ id: 't1', status: 'done' });
    expect(repos.task.update).toHaveBeenCalledWith('t1', expect.objectContaining({ status: 'done', completed_at: expect.any(Date) }));
  });

  test('clears completed_at when status changes from done to todo', async () => {
    repos.task.findByIdAndUser.mockResolvedValue({ id: 't1', status: 'done' });
    repos.task.update.mockResolvedValue({ id: 't1', status: 'todo' });
    repos.task.findByUserAndWeek.mockResolvedValue([]);
    repos.progress.upsert.mockResolvedValue({});

    const result = await taskService.update('u1', 't1', { status: 'todo' });
    expect(result).toEqual({ id: 't1', status: 'todo' });
    expect(repos.task.update).toHaveBeenCalledWith('t1', expect.objectContaining({ status: 'todo', completed_at: null }));
  });

  test('recalculates progress when status changes to done', async () => {
    const task = { id: 't1', status: 'todo', planned_date: '2026-05-04', duration_estimate: 30 };
    const doneTask = { ...task, status: 'done', actual_duration: 25 };
    repos.task.findByIdAndUser.mockResolvedValue(task);
    repos.task.update.mockResolvedValue(doneTask);
    repos.task.findByUserAndWeek.mockResolvedValue([doneTask]);
    repos.progress.upsert.mockResolvedValue({});

    await taskService.update('u1', 't1', { status: 'done' });
    expect(repos.progress.upsert).toHaveBeenCalled();
  });

  test('recalculates progress when status changes from done', async () => {
    const task = { id: 't1', status: 'done', planned_date: '2026-05-04', duration_estimate: 30 };
    const todoTask = { ...task, status: 'todo' };
    repos.task.findByIdAndUser.mockResolvedValue(task);
    repos.task.update.mockResolvedValue(todoTask);
    repos.task.findByUserAndWeek.mockResolvedValue([todoTask]);
    repos.progress.upsert.mockResolvedValue({});

    await taskService.update('u1', 't1', { status: 'todo' });
    expect(repos.progress.upsert).toHaveBeenCalled();
  });

  test('skips progress recalc when status unchanged', async () => {
    repos.task.findByIdAndUser.mockResolvedValue({ id: 't1', status: 'todo' });
    repos.task.update.mockResolvedValue({ id: 't1', status: 'todo', title: 'New' });

    await taskService.update('u1', 't1', { title: 'New' });
    expect(repos.progress.upsert).not.toHaveBeenCalled();
  });

  test('skips progress recalc when task has no planned_date', async () => {
    repos.task.findByIdAndUser.mockResolvedValue({ id: 't1', status: 'todo' });
    repos.task.update.mockResolvedValue({ id: 't1', status: 'done' });

    await taskService.update('u1', 't1', { status: 'done' });
    expect(repos.task.findByUserAndWeek).not.toHaveBeenCalled();
  });
});

describe('taskService.delete', () => {
  test('deletes after verifying ownership', async () => {
    repos.task.findByIdAndUser.mockResolvedValue({ id: 't1' });
    repos.task.remove.mockResolvedValue(true);
    const result = await taskService.delete('u1', 't1');
    expect(result).toBe(true);
    expect(repos.task.remove).toHaveBeenCalledWith('t1', 'u1');
  });

  test('throws 404 when task not found', async () => {
    repos.task.findByIdAndUser.mockResolvedValue(null);
    await expect(taskService.delete('u1', 't1'))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('taskService.recalculateProgress', () => {
  test('skips when no planned_date', async () => {
    await taskService.recalculateProgress('u1', { id: 't1' });
    expect(repos.task.findByUserAndWeek).not.toHaveBeenCalled();
  });

  test('handles empty week gracefully', async () => {
    repos.task.findByUserAndWeek.mockResolvedValue([]);
    await taskService.recalculateProgress('u1', { id: 't1', planned_date: '2026-05-04' });
    expect(repos.progress.upsert).toHaveBeenCalledWith(expect.objectContaining({
      planned_hours: 0,
      completed_hours: 0,
      completion_rate: 0,
    }));
  });

  test('calculates completion_rate from done/total by duration', async () => {
    repos.task.findByUserAndWeek.mockResolvedValue([
      { status: 'done', duration_estimate: 60, actual_duration: null },
      { status: 'todo', duration_estimate: 30, actual_duration: null },
    ]);
    repos.progress.upsert.mockResolvedValue({});

    await taskService.recalculateProgress('u1', { id: 't1', planned_date: '2026-05-04' });
    const call = repos.progress.upsert.mock.calls[0][0];
    expect(call.planned_hours).toBe(1.5);
    expect(call.completed_hours).toBe(1);
    expect(call.completion_rate).toBeCloseTo(0.67, 1);
  });

  test('completion_rate can exceed 1.0 when actual_duration > estimate', async () => {
    repos.task.findByUserAndWeek.mockResolvedValue([
      { status: 'done', duration_estimate: 30, actual_duration: 60 },
    ]);
    repos.progress.upsert.mockResolvedValue({});

    await taskService.recalculateProgress('u1', { id: 't1', planned_date: '2026-05-04' });
    const call = repos.progress.upsert.mock.calls[0][0];
    expect(call.completion_rate).toBe(2);
  });

  test('uses actual_duration when present, falls back to estimate', async () => {
    repos.task.findByUserAndWeek.mockResolvedValue([
      { status: 'done', duration_estimate: 30, actual_duration: 25 },
      { status: 'done', duration_estimate: 45, actual_duration: null },
    ]);
    repos.progress.upsert.mockResolvedValue({});

    await taskService.recalculateProgress('u1', { id: 't1', planned_date: '2026-05-04' });
    const call = repos.progress.upsert.mock.calls[0][0];
    expect(call.completed_hours).toBe(1.2);
    expect(call.planned_hours).toBe(1.3);
  });

  test('calculates rate from completed/planned by duration', async () => {
    repos.task.findByUserAndWeek.mockResolvedValue([
      { status: 'done', duration_estimate: 30, actual_duration: null },
      { status: 'done', duration_estimate: 45, actual_duration: 40 },
    ]);
    repos.progress.upsert.mockResolvedValue({});

    await taskService.recalculateProgress('u1', { id: 't1', planned_date: '2026-05-04' });
    const call = repos.progress.upsert.mock.calls[0][0];
    expect(call.completion_rate).toBeCloseTo(0.93, 2);
  });

  test('ignores non-done tasks in completed_hours', async () => {
    repos.task.findByUserAndWeek.mockResolvedValue([
      { status: 'done', duration_estimate: 30, actual_duration: null },
      { status: 'skipped', duration_estimate: 45, actual_duration: null },
      { status: 'todo', duration_estimate: 60, actual_duration: null },
    ]);
    repos.progress.upsert.mockResolvedValue({});

    await taskService.recalculateProgress('u1', { id: 't1', planned_date: '2026-05-04' });
    const call = repos.progress.upsert.mock.calls[0][0];
    expect(call.completed_hours).toBe(0.5);
    expect(call.planned_hours).toBe(2.3);
  });
});

describe('taskService.updateStatus', () => {
  const todoTask = { id: 't1', status: 'todo', planned_date: '2026-05-04', duration_estimate: 30 };

  beforeEach(() => {
    repos.task.findByIdAndUser.mockReset();
    repos.task.update.mockReset();
    repos.task.findByUserAndWeek.mockReset();
    repos.progress.upsert.mockReset();
    repos.studentMetrics.findByUserId.mockReset();
    repos.studentMetrics.computeRollingMetrics.mockReset();
    repos.studentMetrics.upsert.mockReset();
  });

  test('todo → done: updates status, sets completed_at, updates metrics', async () => {
    repos.task.findByIdAndUser.mockResolvedValue(todoTask);
    repos.task.update.mockResolvedValue({ ...todoTask, status: 'done', completed_at: new Date(), actual_duration: 30 });
    repos.studentMetrics.findByUserId.mockResolvedValue({ streak_days: 2, total_completed: 5, consecutive_skips: 0 });
    repos.studentMetrics.computeRollingMetrics.mockResolvedValue({ completion_rate_7d: 0.8 });
    repos.task.findByUserAndWeek.mockResolvedValue([]);
    repos.progress.upsert.mockResolvedValue({});

    const result = await taskService.updateStatus('u1', 't1', 'done', {});

    expect(result.status).toBe('done');
    expect(repos.task.update).toHaveBeenCalledWith('t1', expect.objectContaining({
      status: 'done',
      completed_at: expect.any(Date),
      actual_duration: 30,
    }));
    expect(repos.studentMetrics.upsert).toHaveBeenCalledWith('u1', expect.objectContaining({
      streak_days: 3,
      total_completed: 6,
      consecutive_skips: 0,
    }));
  });

  test('todo → done: uses provided actual_duration', async () => {
    repos.task.findByIdAndUser.mockResolvedValue(todoTask);
    repos.task.update.mockResolvedValue({ ...todoTask, status: 'done', completed_at: new Date(), actual_duration: 45 });
    repos.studentMetrics.findByUserId.mockResolvedValue({});
    repos.studentMetrics.computeRollingMetrics.mockResolvedValue({});
    repos.task.findByUserAndWeek.mockResolvedValue([]);
    repos.progress.upsert.mockResolvedValue({});

    await taskService.updateStatus('u1', 't1', 'done', { actual_duration: 45 });

    expect(repos.task.update).toHaveBeenCalledWith('t1', expect.objectContaining({ actual_duration: 45 }));
  });

  test('todo → skipped: updates status, sets skip_reason, updates metrics', async () => {
    repos.task.findByIdAndUser.mockResolvedValue(todoTask);
    repos.task.update.mockResolvedValue({ ...todoTask, status: 'skipped' });
    repos.studentMetrics.findByUserId.mockResolvedValue({ total_skipped: 3, consecutive_skips: 1 });
    repos.studentMetrics.computeRollingMetrics.mockResolvedValue({});
    repos.task.findByUserAndWeek.mockResolvedValue([]);
    repos.progress.upsert.mockResolvedValue({});

    const result = await taskService.updateStatus('u1', 't1', 'skipped', { skip_reason: 'too_hard' });

    expect(result.status).toBe('skipped');
    expect(repos.task.update).toHaveBeenCalledWith('t1', expect.objectContaining({
      status: 'skipped',
      skip_reason: 'too_hard',
    }));
    expect(repos.studentMetrics.upsert).toHaveBeenCalledWith('u1', expect.objectContaining({
      total_skipped: 4,
      consecutive_skips: 2,
    }));
  });

  test('done → todo: throws INVALID_TRANSITION', async () => {
    repos.task.findByIdAndUser.mockResolvedValue({ id: 't1', status: 'done' });

    await expect(taskService.updateStatus('u1', 't1', 'todo', {}))
      .rejects.toMatchObject({ statusCode: 400, code: 'INVALID_TRANSITION' });
  });

  test('task not found: throws 404', async () => {
    repos.task.findByIdAndUser.mockResolvedValue(null);

    await expect(taskService.updateStatus('u1', 't1', 'done', {}))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  test('recalculates progress when planned_date exists', async () => {
    repos.task.findByIdAndUser.mockResolvedValue(todoTask);
    repos.task.update.mockResolvedValue({ ...todoTask, status: 'done' });
    repos.studentMetrics.findByUserId.mockResolvedValue({});
    repos.studentMetrics.computeRollingMetrics.mockResolvedValue({});
    repos.task.findByUserAndWeek.mockResolvedValue([]);
    repos.progress.upsert.mockResolvedValue({});

    await taskService.updateStatus('u1', 't1', 'done', {});

    expect(repos.progress.upsert).toHaveBeenCalled();
  });

  test('in_progress → done: valid transition', async () => {
    repos.task.findByIdAndUser.mockResolvedValue({ ...todoTask, status: 'in_progress' });
    repos.task.update.mockResolvedValue({ ...todoTask, status: 'done' });
    repos.studentMetrics.findByUserId.mockResolvedValue({});
    repos.studentMetrics.computeRollingMetrics.mockResolvedValue({});
    repos.task.findByUserAndWeek.mockResolvedValue([]);
    repos.progress.upsert.mockResolvedValue({});

    const result = await taskService.updateStatus('u1', 't1', 'done', {});
    expect(result.status).toBe('done');
  });
});
