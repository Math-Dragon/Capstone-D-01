jest.mock('../../src/repositories', () => ({
  task: { listByUser: jest.fn() },
  studentMetrics: { findByUserId: jest.fn() },
  profile: { findByUserId: jest.fn() },
  checkInEvent: {
    listByUser: jest.fn(),
    findOwnedById: jest.fn(),
    create: jest.fn(),
    correct: jest.fn(),
    remove: jest.fn(),
    countByUser: jest.fn(),
  },
  audit: { create: jest.fn() },
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

describe('progressService.getOverview', () => {
  const now = new Date('2026-09-24T12:00:00.000Z');

  function fixtures() {
    return [
      { id: 't1', status: 'done', planned_date: '2026-09-20', completed_at: new Date('2026-09-20T10:00:00.000Z'), duration_estimate: 30, actual_duration: 25, task_type: 'practice', feedback_difficulty: 3 },
      { id: 't2', status: 'done', planned_date: '2026-09-21', completed_at: new Date('2026-09-22T01:00:00.000Z'), duration_estimate: 60, actual_duration: null, task_type: 'recall', feedback_difficulty: 4 },
      { id: 't3', status: 'todo', planned_date: '2026-09-23', completed_at: null, duration_estimate: 45, actual_duration: null, task_type: 'acquire', feedback_difficulty: null },
      { id: 't4', status: 'done', planned_date: '2026-09-01', completed_at: new Date('2026-08-30T10:00:00.000Z'), duration_estimate: 30, actual_duration: 30, task_type: 'review', feedback_difficulty: 2 },
      { id: 't5', status: 'done', planned_date: '2026-09-10', completed_at: new Date('2026-09-19T02:00:00.000Z'), duration_estimate: 30, actual_duration: 20, task_type: 'practice', feedback_difficulty: null },
      { id: 't6', status: 'done', planned_date: '2026-09-20', completed_at: null, duration_estimate: 30, actual_duration: null, task_type: 'review', feedback_difficulty: null },
    ];
  }

  beforeEach(() => {
    repos.profile.findByUserId.mockResolvedValue({ timezone: 'Asia/Jakarta' });
    repos.task.listByUser.mockResolvedValue(fixtures());
    repos.checkInEvent.countByUser.mockResolvedValue(4);
  });

  test('buckets reconcile with the headline and evidence uses local-day bounds', async () => {
    const result = await progressService.getOverview('user-1', '7d', now);

    expect(result.timezone).toBe('Asia/Jakarta');
    expect(result.period).toEqual({ key: '7d', from: '2026-09-18', to: '2026-09-24', bucket: 'day' });
    expect(result.health.total_tasks).toBe(4);
    expect(result.health.completed_tasks).toBe(3);

    const bucketTasks = result.activity.reduce((s, b) => s + b.completed_tasks, 0);
    const bucketMinutes = result.activity.reduce((s, b) => s + b.completed_minutes, 0);
    expect(bucketTasks).toBe(result.health.completed_tasks);
    expect(bucketMinutes).toBe(result.health.completed_minutes);

    expect(repos.checkInEvent.countByUser).toHaveBeenCalledWith('user-1', {
      from: '2026-09-18', to: '2026-09-25', timezone: 'Asia/Jakarta',
    });
    expect(result.evidence).toEqual({ available: true, signal_count: 4 });
    expect(result.insight.code).toBe('momentum_positive');
  });

  test('done tasks without completed_at are excluded from completions', async () => {
    const result = await progressService.getOverview('user-1', '7d', now);
    expect(result.health.completed_tasks).toBe(3);
  });

  test('defaults to Asia/Jakarta when no profile exists', async () => {
    repos.profile.findByUserId.mockResolvedValue(null);
    const result = await progressService.getOverview('user-1', '7d', now);
    expect(result.timezone).toBe('Asia/Jakarta');
  });

  test('coach_strategy follows rules for low completion rate', async () => {
    repos.task.listByUser.mockResolvedValue([
      { id: 't1', status: 'done', planned_date: '2026-09-20', completed_at: new Date('2026-09-20'), duration_estimate: 30 },
      { id: 't2', status: 'todo', planned_date: '2026-09-21', completed_at: null, duration_estimate: 30 },
      { id: 't3', status: 'todo', planned_date: '2026-09-23', completed_at: null, duration_estimate: 45 },
    ]);
    repos.studentMetrics.findByUserId.mockResolvedValue({ streak_days: 1, last_mood: null, consecutive_skips: 0 });
    const result = await progressService.getOverview('user-1', '7d', now);
    expect(result.coach_strategy).not.toBeNull();
    expect(result.coach_strategy.text).toBe('Mulai dari satu tugas singkat, lalu evaluasi kembali kapasitas belajarmu.');
    expect(result.coach_strategy.source).toBe('rule_based');
  });

  test('coach_strategy crisis for consecutive_skips >= 3', async () => {
    repos.task.listByUser.mockResolvedValue([
      { id: 't1', status: 'done', planned_date: '2026-09-20', completed_at: new Date('2026-09-20'), duration_estimate: 30 },
      { id: 't2', status: 'done', planned_date: '2026-09-21', completed_at: new Date('2026-09-21'), duration_estimate: 30 },
      { id: 't3', status: 'done', planned_date: '2026-09-22', completed_at: new Date('2026-09-22'), duration_estimate: 30 },
    ]);
    repos.studentMetrics.findByUserId.mockResolvedValue({ streak_days: 1, last_mood: null, consecutive_skips: 3 });
    const result = await progressService.getOverview('user-1', '7d', now);
    expect(result.coach_strategy).not.toBeNull();
    expect(result.coach_strategy.text).toBe('Kurangi beban dulu: pilih satu tugas paling ringan dan beri ruang pemulihan.');
    expect(result.coach_strategy.source).toBe('rule_based');
  });

  test('coach_strategy maintain for rate >= 0.7', async () => {
    repos.task.listByUser.mockResolvedValue([
      { id: 't1', status: 'done', planned_date: '2026-09-20', completed_at: new Date('2026-09-20'), duration_estimate: 30 },
      { id: 't2', status: 'done', planned_date: '2026-09-21', completed_at: new Date('2026-09-21'), duration_estimate: 30 },
      { id: 't3', status: 'done', planned_date: '2026-09-22', completed_at: new Date('2026-09-22'), duration_estimate: 30 },
    ]);
    repos.studentMetrics.findByUserId.mockResolvedValue({ streak_days: 2, last_mood: null, consecutive_skips: 0 });
    const result = await progressService.getOverview('user-1', '7d', now);
    expect(result.coach_strategy).not.toBeNull();
    expect(result.coach_strategy.text).toBe('Pertahankan ritme dan sesuaikan beban jika diperlukan.');
    expect(result.coach_strategy.source).toBe('rule_based');
  });

  test('coach_strategy is null and completion_rate is 0 when no scoped tasks', async () => {
    repos.task.listByUser.mockResolvedValue([]);
    const result = await progressService.getOverview('user-1', '7d', now);
    expect(result.coach_strategy).toBeNull();
    expect(result.health.completion_rate).toBe(0);
    expect(result.health.progress_percent).toBe(0);
  });
});

describe('progressService.getHistory', () => {
  function row(overrides = {}) {
    return {
      id: 'e1',
      event_type: 'submitted',
      created_at: new Date('2026-09-24T10:00:00.123Z'),
      mood: 'good',
      note: null,
      source: 'manual',
      metadata: {},
      correction_count: 0,
      corrected_at: null,
      version: 0,
      linked_task: null,
      linked_goal: null,
      ...overrides,
    };
  }

  test('paginates with limit+1 and exposes the boundary as next_cursor', async () => {
    repos.checkInEvent.listByUser.mockResolvedValue([row({ id: 'e1' }), row({ id: 'e2' }), row({ id: 'e3' })]);

    const result = await progressService.getHistory('user-1', { filter: 'all', limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.page.has_more).toBe(true);
    const decoded = JSON.parse(Buffer.from(result.page.next_cursor, 'base64url').toString('utf8'));
    expect(decoded).toEqual({ created_at: '2026-09-24T10:00:00.123Z', id: 'e2' });
  });

  test('rejects malformed cursors', async () => {
    await expect(progressService.getHistory('user-1', { filter: 'all', limit: 20, cursor: '!!!' }))
      .rejects.toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR' });
  });
});

describe('progressService.getHistoryDetail', () => {
  test('exposes the integer version', async () => {
    repos.checkInEvent.findOwnedById.mockResolvedValue({
      id: 'e1',
      event_type: 'submitted',
      created_at: new Date('2026-09-24T10:00:00.123Z'),
      mood: 'good',
      note: null,
      source: 'manual',
      metadata: {},
      correction_count: 0,
      corrected_at: null,
      version: 7,
      linked_task: null,
      linked_goal: null,
    });

    const result = await progressService.getHistoryDetail('user-1', 'e1');
    expect(result.version).toBe(7);
  });
});

describe('progressService.correctHistory', () => {
  function detailRow() {
    return {
      id: 'e1',
      event_type: 'submitted',
      created_at: new Date('2026-09-24T10:00:00.123Z'),
      mood: 'okay',
      note: 'fixed',
      source: 'manual',
      metadata: {},
      correction_count: 1,
      corrected_at: new Date('2026-09-24T11:00:00.000Z'),
      version: 1,
      linked_task: null,
      linked_goal: null,
    };
  }

  test('passes the mood/note/version subset to the repo and returns the new version', async () => {
    repos.checkInEvent.findOwnedById
      .mockResolvedValueOnce({ id: 'e1', event_type: 'submitted' })
      .mockResolvedValueOnce(detailRow());
    repos.checkInEvent.correct.mockResolvedValue({ id: 'e1' });
    repos.audit.create.mockResolvedValue({});

    const result = await progressService.correctHistory('user-1', 'e1', {
      mood: null, note: 'fixed', reason_code: 'incorrect_mood', version: 0,
    });

    expect(repos.checkInEvent.correct).toHaveBeenCalledWith('user-1', 'e1', {
      mood: null, note: 'fixed', version: 0,
    });
    expect(repos.audit.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-1',
      action: 'CHECK_IN_EVENT_CORRECTED',
    }));
    expect(result.version).toBe(1);
  });

  test('stale version surfaces as 409', async () => {
    repos.checkInEvent.findOwnedById.mockResolvedValue({ id: 'e1', event_type: 'submitted' });
    repos.checkInEvent.correct.mockResolvedValue(null);
    await expect(progressService.correctHistory('user-1', 'e1', { mood: 'good', version: 3 }))
      .rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
  });

  test('skipped events cannot be corrected', async () => {
    repos.checkInEvent.findOwnedById.mockResolvedValue({ id: 'e1', event_type: 'skipped' });
    await expect(progressService.correctHistory('user-1', 'e1', { note: 'x', version: 0 }))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  test('missing events surface as 404', async () => {
    repos.checkInEvent.findOwnedById.mockResolvedValue(null);
    await expect(progressService.correctHistory('user-1', 'nope', { note: 'x', version: 0 }))
      .rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('progressService.deleteHistory', () => {
  test('removes the row and audits', async () => {
    repos.checkInEvent.remove.mockResolvedValue({ id: 'e1', event_type: 'submitted' });
    repos.audit.create.mockResolvedValue({});
    await expect(progressService.deleteHistory('user-1', 'e1')).resolves.toEqual({ id: 'e1', deleted: true });
  });

  test('missing rows surface as 404', async () => {
    repos.checkInEvent.remove.mockResolvedValue(null);
    await expect(progressService.deleteHistory('user-1', 'nope')).rejects.toMatchObject({ statusCode: 404 });
  });
});
