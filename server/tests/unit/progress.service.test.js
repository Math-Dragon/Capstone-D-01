jest.mock('../../src/repositories', () => ({
  task: { listByUser: jest.fn() },
  studentMetrics: { findByUserId: jest.fn() },
}));

const repos = require('../../src/repositories');
const progressService = require('../../src/services/progress.service');

describe('progressService.getStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns empty stats when no tasks', async () => {
    repos.task.listByUser.mockResolvedValue([]);
    repos.studentMetrics.findByUserId.mockResolvedValue(null);

    const result = await progressService.getStats('user-1');

    expect(result.totalTasks).toBe(0);
    expect(result.completedTasks).toBe(0);
    expect(result.totalMinutes).toBe(0);
    expect(result.completedMinutes).toBe(0);
    expect(result.completionRate).toBe(0);
    expect(result.avgDifficulty).toBeNull();
    expect(result.streakDays).toBe(0);
  });

  test('calculates stats correctly', async () => {
    repos.task.listByUser.mockResolvedValue([
      { status: 'done', duration_estimate: 30, feedback_difficulty: 3 },
      { status: 'done', duration_estimate: 45, feedback_difficulty: 4 },
      { status: 'todo', duration_estimate: 60, feedback_difficulty: null },
    ]);
    repos.studentMetrics.findByUserId.mockResolvedValue({ streak_days: 5 });

    const result = await progressService.getStats('user-1');

    expect(result.totalTasks).toBe(3);
    expect(result.completedTasks).toBe(2);
    expect(result.totalMinutes).toBe(135);
    expect(result.completedMinutes).toBe(75);
    expect(result.completionRate).toBeCloseTo(2 / 3);
    expect(result.avgDifficulty).toBe(3.5);
    expect(result.streakDays).toBe(5);
  });

  test('handles completed status', async () => {
    repos.task.listByUser.mockResolvedValue([
      { status: 'completed', duration_estimate: 30, feedback_difficulty: null },
    ]);
    repos.studentMetrics.findByUserId.mockResolvedValue(null);

    const result = await progressService.getStats('user-1');
    expect(result.completedTasks).toBe(1);
    expect(result.completionRate).toBe(1);
  });

  test('handles null feedback_difficulty', async () => {
    repos.task.listByUser.mockResolvedValue([
      { status: 'done', duration_estimate: 30, feedback_difficulty: null },
      { status: 'done', duration_estimate: 45, feedback_difficulty: null },
    ]);
    repos.studentMetrics.findByUserId.mockResolvedValue(null);

    const result = await progressService.getStats('user-1');
    expect(result.avgDifficulty).toBeNull();
  });
});

describe('progressService.getWeekly', () => {
  test('delegates to repository', async () => {
    const mockData = [{ week: '2026-W19', completion_rate: 0.8 }];
    repos.progress = { findByUserAndWeek: jest.fn().mockResolvedValue(mockData) };

    const result = await progressService.getWeekly('user-1', '2026-W19');
    expect(repos.progress.findByUserAndWeek).toHaveBeenCalledWith('user-1', '2026-W19');
    expect(result).toEqual(mockData);
  });
});

describe('progressService.getTrend', () => {
  test('delegates to repository', async () => {
    const mockTrend = [{ week: '2026-W18', rate: 0.7 }];
    repos.progress = { listTrend: jest.fn().mockResolvedValue(mockTrend) };

    const result = await progressService.getTrend('user-1', { limit: 4 });
    expect(repos.progress.listTrend).toHaveBeenCalledWith('user-1', { limit: 4 });
    expect(result).toEqual(mockTrend);
  });
});
