jest.mock('../../src/repositories', () => ({
  task: { findByUserAndDateRange: jest.fn() },
  progress: { findByUserAndWeek: jest.fn() },
}));

const repos = require('../../src/repositories');
const exportService = require('../../src/services/export.service');

describe('exportService.getWeeklyExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns correct structure with tasks and summary', async () => {
    repos.task.findByUserAndDateRange.mockResolvedValue([
      { title: 'Task A', planned_date: '2026-06-15', planned_slot: 'morning', duration_estimate: 30, status: 'done' },
      { title: 'Task B', planned_date: '2026-06-16', planned_slot: 'afternoon', duration_estimate: 60, status: 'todo' },
    ]);
    repos.progress.findByUserAndWeek.mockResolvedValue({
      planned_hours: 1.5,
      completed_hours: 0.5,
      completion_rate: 0.33,
    });

    const result = await exportService.getWeeklyExport('user-1', '2026-06-15');

    expect(result.week).toBe('2026-06-15');
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].title).toBe('Task A');
    expect(result.summary.planned_hours).toBe(1.5);
    expect(result.summary.completed_hours).toBe(0.5);
    expect(result.summary.completion_rate).toBe(0.33);
    expect(result.exported_at).toBeTruthy();
  });

  test('passes correct date range to findByUserAndDateRange', async () => {
    repos.task.findByUserAndDateRange.mockResolvedValue([]);
    repos.progress.findByUserAndWeek.mockResolvedValue(null);

    await exportService.getWeeklyExport('user-1', '2026-06-15');

    expect(repos.task.findByUserAndDateRange).toHaveBeenCalledWith(
      'user-1', '2026-06-15', '2026-06-21'
    );
  });

  test('handles empty tasks gracefully', async () => {
    repos.task.findByUserAndDateRange.mockResolvedValue([]);
    repos.progress.findByUserAndWeek.mockResolvedValue(null);

    const result = await exportService.getWeeklyExport('user-1', '2026-06-22');

    expect(result.tasks).toHaveLength(0);
    expect(result.summary.planned_hours).toBe(0);
    expect(result.summary.completed_hours).toBe(0);
    expect(result.summary.completion_rate).toBe(0);
  });

  test('queries progress with correct ISO week', async () => {
    repos.task.findByUserAndDateRange.mockResolvedValue([]);
    repos.progress.findByUserAndWeek.mockResolvedValue(null);

    await exportService.getWeeklyExport('user-1', '2026-01-05');

    expect(repos.progress.findByUserAndWeek).toHaveBeenCalledWith('user-1', '2026-W02');
  });

  test('scopes tasks to the requesting user', async () => {
    repos.task.findByUserAndDateRange.mockResolvedValue([]);
    repos.progress.findByUserAndWeek.mockResolvedValue(null);

    await exportService.getWeeklyExport('alice', '2026-06-15');
    await exportService.getWeeklyExport('bob', '2026-06-15');

    expect(repos.task.findByUserAndDateRange).toHaveBeenNthCalledWith(
      1, 'alice', '2026-06-15', '2026-06-21'
    );
    expect(repos.task.findByUserAndDateRange).toHaveBeenNthCalledWith(
      2, 'bob', '2026-06-15', '2026-06-21'
    );
  });
});
