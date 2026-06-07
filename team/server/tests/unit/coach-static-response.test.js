jest.mock('../../src/repositories', () => ({
  studentMetrics: { findByUserId: jest.fn() },
  task: { findByIdAndUser: jest.fn(), update: jest.fn() },
  chatMessage: { create: jest.fn() },
  audit: { create: jest.fn() },
  profile: { findByUserId: jest.fn() },
}));

const repos = require('../../src/repositories');
const {
  respondTaskCompleted,
  respondFeedback,
  respondSkip,
  respondCheckIn,
} = require('../../src/services/coach/static-response.service');

beforeEach(() => jest.clearAllMocks());

describe('respondTaskCompleted', () => {
  test('streak >= 7 message', async () => {
    repos.studentMetrics.findByUserId.mockResolvedValue({ streak_days: 8, total_completed: 20 });
    repos.task.findByIdAndUser.mockResolvedValue({ title: 'Task A' });
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondTaskCompleted('u1', { taskId: 't1' }, 's1');
    expect(result.data.message).toContain('8');
    expect(result.data.message).toContain('Task A');
  });

  test('streak >= 3 message', async () => {
    repos.studentMetrics.findByUserId.mockResolvedValue({ streak_days: 4, total_completed: 10 });
    repos.task.findByIdAndUser.mockResolvedValue({ title: 'Task B' });
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondTaskCompleted('u1', { taskId: 't1' }, 's1');
    expect(result.data.message).toContain('4');
  });

  test('streak < 3 message', async () => {
    repos.studentMetrics.findByUserId.mockResolvedValue({ streak_days: 1, total_completed: 5 });
    repos.task.findByIdAndUser.mockResolvedValue({ title: 'Task C' });
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondTaskCompleted('u1', { taskId: 't1' }, 's1');
    expect(result.data.message).toContain('5');
  });

  test('handles null metrics', async () => {
    repos.studentMetrics.findByUserId.mockResolvedValue(null);
    repos.task.findByIdAndUser.mockResolvedValue({ title: 'SomeTask' });
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondTaskCompleted('u1', { taskId: 't1' }, 's1');
    expect(result.data.message).toContain('SomeTask');
  });

  test('handles null task', async () => {
    repos.studentMetrics.findByUserId.mockResolvedValue({ streak_days: 1, total_completed: 0 });
    repos.task.findByIdAndUser.mockResolvedValue(null);
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondTaskCompleted('u1', { taskId: 't1' }, 's1');
    expect(result.data.message).toContain('Tugas');
  });
});

describe('respondFeedback', () => {
  test('high difficulty (>=4) message', async () => {
    repos.task.findByIdAndUser.mockResolvedValue({ title: 'Hard Task' });
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondFeedback('u1', { taskId: 't1', difficulty: 5, focus: 3 }, 's1');
    expect(result.data.message).toContain('menantang');
  });

  test('low difficulty (<=2) message', async () => {
    repos.task.findByIdAndUser.mockResolvedValue({ title: 'Easy Task' });
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondFeedback('u1', { taskId: 't1', difficulty: 1, focus: 4 }, 's1');
    expect(result.data.message).toContain('mudah');
  });

  test('mid difficulty message', async () => {
    repos.task.findByIdAndUser.mockResolvedValue({ title: 'Mid Task' });
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondFeedback('u1', { taskId: 't1', difficulty: 3, focus: 3 }, 's1');
    expect(result.data.message).toContain('Mid Task');
  });

  test('uses default difficulty 3 when not provided', async () => {
    repos.task.findByIdAndUser.mockResolvedValue({ title: 'T' });
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondFeedback('u1', { taskId: 't1' }, 's1');
    expect(result.data.message).toBeDefined();
  });

  test('uses taskTitle fallback when task null', async () => {
    repos.task.findByIdAndUser.mockResolvedValue(null);
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondFeedback('u1', { taskId: 't1', taskTitle: 'Fallback', difficulty: 3 }, 's1');
    expect(result.data.message).toContain('Fallback');
  });
});

describe('respondSkip', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  test('reschedules task and sends message', async () => {
    repos.task.findByIdAndUser.mockResolvedValue({ title: 'Skipped Task' });
    repos.profile.findByUserId.mockResolvedValue({ availability: ['mon', 'wed'] });
    repos.task.update.mockResolvedValue({});
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondSkip('u1', { taskId: 't1', reason: 'busy' }, 's1');
    expect(result.data.message).toContain('Skipped Task');
    expect(result.data.message).toContain('busy');
    expect(repos.task.update).toHaveBeenCalledWith('t1', expect.objectContaining({ planned_date: expect.any(String) }));
  });

  test('reschedules to a future local calendar date without UTC date rollback', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-20T14:35:00.000Z'));
    repos.task.findByIdAndUser.mockResolvedValue({ title: 'Skipped Task' });
    repos.profile.findByUserId.mockResolvedValue({ availability: ['thu'] });
    repos.task.update.mockResolvedValue({});
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    await respondSkip('u1', { taskId: 't1', reason: 'busy' }, 's1');

    expect(repos.task.update).toHaveBeenCalledWith('t1', expect.objectContaining({ planned_date: '2026-05-21' }));
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });


  test('uses default reason when not provided', async () => {
    repos.task.findByIdAndUser.mockResolvedValue(null);
    repos.profile.findByUserId.mockResolvedValue(null);
    repos.task.update.mockResolvedValue({});
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondSkip('u1', { taskId: 't1' }, 's1');
    expect(result.data.message).toContain('unspecified');
  });

  test('uses taskTitle fallback', async () => {
    repos.task.findByIdAndUser.mockResolvedValue(null);
    repos.profile.findByUserId.mockResolvedValue(null);
    repos.task.update.mockResolvedValue({});
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondSkip('u1', { taskId: 't1', taskTitle: 'Fallback Task' }, 's1');
    expect(result.data.message).toContain('Fallback Task');
  });
});

describe('respondCheckIn', () => {
  test('streak >= 7 message', async () => {
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondCheckIn('u1', { mood: 'great' }, 's1', { streak_days: 8, completion_rate_7d: 0.9 });
    expect(result.data.message).toContain('8');
  });

  test('streak >= 3 message', async () => {
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondCheckIn('u1', { mood: 'okay' }, 's1', { streak_days: 4, completion_rate_7d: 0.7 });
    expect(result.data.message).toContain('4');
  });

  test('mood great message', async () => {
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondCheckIn('u1', { mood: 'great' }, 's1', { streak_days: 1, completion_rate_7d: 0.5 });
    expect(result.data.message).toContain('prima');
  });

  test('default message', async () => {
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondCheckIn('u1', { mood: 'okay' }, 's1', { streak_days: 1, completion_rate_7d: 0.5 });
    expect(result.data.message).toContain('check-in');
  });

  test('uses default mood okay', async () => {
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondCheckIn('u1', {}, 's1', { streak_days: 0, completion_rate_7d: 0 });
    expect(result.data.message).toBeDefined();
  });

  test('handles null metrics', async () => {
    repos.chatMessage.create.mockResolvedValue({});
    repos.audit.create.mockResolvedValue({});

    const result = await respondCheckIn('u1', { mood: 'okay' }, 's1', null);
    expect(result.data.message).toBeDefined();
  });
});
