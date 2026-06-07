jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const {
  scheduleTasks,
} = require('../../src/services/scheduler.service');

const baseTask = (overrides = {}) => ({
  id: 't1',
  title: 'Test task',
  duration_estimate: 30,
  task_type: 'acquire',
  ...overrides,
});

describe('scheduleTasks', () => {
  test('returns empty array when tasks is empty', () => {
    const result = scheduleTasks([], { availableDays: ['mon'], weeklyTargetHours: 5, deadline: null, preferredSlot: 'morning' });
    expect(result).toEqual([]);
  });

  test('returns null when tasks is null', () => {
    const result = scheduleTasks(null, { availableDays: ['mon'], weeklyTargetHours: 5, deadline: null, preferredSlot: 'morning' });
    expect(result).toBeNull();
  });

  test('schedules tasks within daily limit', () => {
    const tasks = [
      baseTask({ id: 't1', duration_estimate: 30 }),
      baseTask({ id: 't2', duration_estimate: 30 }),
    ];

    const result = scheduleTasks(tasks, { availableDays: ['mon', 'tue', 'wed', 'thu', 'fri'], weeklyTargetHours: 5, deadline: null, preferredSlot: 'morning' });

    expect(result.length).toBe(2);
    expect(result[0]).toHaveProperty('planned_date');
    expect(result[0]).toHaveProperty('planned_slot');
    expect(result[1]).toHaveProperty('planned_date');
    expect(result[1]).toHaveProperty('planned_slot');
  });

  test('widens to all days when no candidate dates match availability', () => {
    const tasks = [baseTask({ id: 't1', duration_estimate: 30 })];

    const result = scheduleTasks(tasks, { availableDays: ['sun'], weeklyTargetHours: 5, deadline: null, preferredSlot: 'morning' });

    expect(result.length).toBe(1);
  });

  test('uses fallback next 7 days when no candidates at all', () => {
    const tasks = [baseTask({ id: 't1', duration_estimate: 30 })];

    const result = scheduleTasks(tasks, { availableDays: [], weeklyTargetHours: 0, deadline: new Date(Date.now() - 86400000).toISOString(), preferredSlot: 'morning' });

    expect(result.length).toBe(1);
  });

  test('handles overflow with compression', () => {
    const tasks = Array.from({ length: 20 }, (_, i) => baseTask({ id: `t${i}`, duration_estimate: 60, task_type: 'acquire' }));

    const result = scheduleTasks(tasks, { availableDays: ['mon'], weeklyTargetHours: 5, deadline: new Date(Date.now() + 7 * 86400000).toISOString(), preferredSlot: 'morning' });

    expect(result.length).toBe(20);
  });

  test('sorts by pedagogical order in initial pass then by id', () => {
    const tasks = [
      baseTask({ id: 't-reflect', duration_estimate: 30, task_type: 'reflect' }),
      baseTask({ id: 't-acquire', duration_estimate: 30, task_type: 'acquire' }),
      baseTask({ id: 't-practice', duration_estimate: 30, task_type: 'practice' }),
    ];

    const result = scheduleTasks(tasks, { availableDays: ['mon', 'tue', 'wed', 'thu', 'fri'], weeklyTargetHours: 5, deadline: null, preferredSlot: 'morning' });
    expect(result.length).toBe(3);
  });

  test('handles unknown task_type with fallback order', () => {
    const tasks = [
      baseTask({ id: 't1', duration_estimate: 30, task_type: 'unknown' }),
      baseTask({ id: 't2', duration_estimate: 30, task_type: 'acquire' }),
    ];

    const result = scheduleTasks(tasks, { availableDays: ['mon', 'tue', 'wed', 'thu', 'fri'], weeklyTargetHours: 5, deadline: null, preferredSlot: 'morning' });

    expect(result.length).toBe(2);
  });
});

describe('scheduleTasks with validDays', () => {
  test('uses provided validDays when available', () => {
    const tasks = [baseTask({ id: 't1', duration_estimate: 30 })];

    const result = scheduleTasks(tasks, { availableDays: ['mon'], weeklyTargetHours: 5, deadline: new Date(Date.now() + 30 * 86400000).toISOString(), preferredSlot: 'morning' });

    expect(result.length).toBe(1);
    const day = new Date(result[0].planned_date).getDay();
    expect(day).toBe(1);
  });

  test('defaults to weekdays when availableDays is empty', () => {
    const tasks = [baseTask({ id: 't1', duration_estimate: 30 })];

    const result = scheduleTasks(tasks, { availableDays: [], weeklyTargetHours: 5, deadline: new Date(Date.now() + 30 * 86400000).toISOString(), preferredSlot: 'morning' });

    expect(result.length).toBe(1);
  });
});
