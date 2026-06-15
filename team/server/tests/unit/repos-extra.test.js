jest.mock('../../src/db', () => ({ query: jest.fn() }));
const db = require('../../src/db');
const studentMetricsRepo = require('../../src/repositories/student-metrics.repo');
const aiRecRepo = require('../../src/repositories/ai-recommendation.repo');
const progressRepo = require('../../src/repositories/progress-snapshot.repo');

beforeEach(() => jest.clearAllMocks());

describe('student-metrics.repo', () => {
  test('findByUserId returns row or null', async () => {
    db.query.mockResolvedValue({ rows: [{ user_id: 'u1', streak_days: 5 }] });
    expect(await studentMetricsRepo.findByUserId('u1')).toEqual({ user_id: 'u1', streak_days: 5 });

    db.query.mockResolvedValue({ rows: [] });
    expect(await studentMetricsRepo.findByUserId('u1')).toBeNull();
  });

  test('upsert with empty updates falls back to findByUserId', async () => {
    db.query.mockResolvedValue({ rows: [{ user_id: 'u1' }] });
    const result = await studentMetricsRepo.upsert('u1', {});
    expect(result).toEqual({ user_id: 'u1' });
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), ['u1'], undefined);
  });

  test('upsert with regular keys', async () => {
    db.query.mockResolvedValue({ rows: [{ user_id: 'u1', streak_days: 7 }] });
    const result = await studentMetricsRepo.upsert('u1', { streak_days: 7 });
    expect(result).toEqual({ user_id: 'u1', streak_days: 7 });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT'),
      ['u1', 7],
      undefined,
    );
  });

  test('upsert with trigger_cooldowns serializes to JSON', async () => {
    db.query.mockResolvedValue({ rows: [{ user_id: 'u1' }] });
    await studentMetricsRepo.upsert('u1', { trigger_cooldowns: { crisis: '2026-01-01' } });
    const callArgs = db.query.mock.calls[0];
    expect(callArgs[1][1]).toBe('{"crisis":"2026-01-01"}');
    expect(callArgs[0]).toContain('trigger_cooldowns = EXCLUDED.trigger_cooldowns');
  });

  test('upsert with mixed keys handles trigger_cooldowns differently', async () => {
    db.query.mockResolvedValue({ rows: [{ user_id: 'u1' }] });
    await studentMetricsRepo.upsert('u1', { streak_days: 3, trigger_cooldowns: { a: 1 } });
    const callArgs = db.query.mock.calls[0];
    const sql = callArgs[0];
    expect(sql).toContain('trigger_cooldowns = EXCLUDED.trigger_cooldowns');
    expect(sql).toContain('streak_days = EXCLUDED.streak_days');
  });

  test('computeRollingMetrics returns parsed metrics', async () => {
    db.query.mockResolvedValue({
      rows: [{
        completion_rate_7d: 0.85,
        completion_rate_3d: 0.70,
        avg_difficulty_7d: 3.5,
      }],
    });
    const result = await studentMetricsRepo.computeRollingMetrics('u1');
    expect(result).toEqual({
      completion_rate_7d: 0.85,
      completion_rate_3d: 0.70,
      avg_difficulty_7d: 3.5,
    });
    const sql = db.query.mock.calls[0][0];
    expect(sql).toContain('t.status');
    expect(sql).toContain('t.completed_at');
    expect(sql).toContain('t.feedback_difficulty');
  });

  test('computeRollingMetrics handles null row', async () => {
    db.query.mockResolvedValue({ rows: [{}] });
    const result = await studentMetricsRepo.computeRollingMetrics('u1');
    expect(result).toEqual({
      completion_rate_7d: 0,
      completion_rate_3d: 0,
      avg_difficulty_7d: 0,
    });
  });
});

describe('ai-recommendation.repo', () => {
  test('findByIdAndUserId without client skips lock', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'r1' }] });
    const result = await aiRecRepo.findByIdAndUserId('r1', 'u1');
    expect(result).toEqual({ id: 'r1' });
    const sql = db.query.mock.calls[0][0];
    expect(sql).not.toContain('FOR UPDATE');
  });

  test('findByIdAndUserId with forUpdate adds lock', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'r1' }] });
    const client = {};
    await aiRecRepo.findByIdAndUserId('r1', 'u1', client, { forUpdate: true });
    const sql = db.query.mock.calls[0][0];
    expect(sql).toContain('FOR UPDATE');
  });

  test('findByIdAndUserId returns null when not found', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await aiRecRepo.findByIdAndUserId('r1', 'u1')).toBeNull();
  });

  test('create inserts and returns row', async () => {
    const row = { id: 'r1', status: 'pending' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await aiRecRepo.create({
      user_id: 'u1', goal_id: 'g1', type: 'plan', input_context: {}, output: { tasks: [] },
    });
    expect(result).toEqual(row);
  });

  test('create with null goal_id and null status uses defaults', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'r1' }] });
    await aiRecRepo.create({
      user_id: 'u1', goal_id: null, type: 'plan', input_context: {}, output: {},
    });
    const callArgs = db.query.mock.calls[0][1];
    expect(callArgs[1]).toBeNull();
  });

  test('updateStatus returns row', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'r1', status: 'accepted' }] });
    const result = await aiRecRepo.updateStatus('r1', 'accepted');
    expect(result).toEqual({ id: 'r1', status: 'accepted' });
  });

  test('updateOutput returns row', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'r1' }] });
    const result = await aiRecRepo.updateOutput('r1', { tasks: [] });
    expect(result).toEqual({ id: 'r1' });
  });

  test('computeAllMetrics returns row', async () => {
    db.query.mockResolvedValue({ rows: [{ suggested: 10, accepted: 5, rejected: 2, pending: 3 }] });
    const result = await aiRecRepo.computeAllMetrics();
    expect(result).toEqual({ suggested: 10, accepted: 5, rejected: 2, pending: 3 });
  });

  test('computeAllMetrics returns defaults when no rows', async () => {
    db.query.mockResolvedValue({ rows: [] });
    const result = await aiRecRepo.computeAllMetrics();
    expect(result).toEqual({ suggested: 0, accepted: 0, rejected: 0, pending: 0 });
  });

  test('computeRationaleMetrics aggregates accepted and suggested tasks by rationale factor', async () => {
    db.query.mockResolvedValue({
      rows: [
        { factor: 'preference_match', suggested: 4, accepted: 3 },
        { factor: 'learning_science', suggested: 2, accepted: 1 },
      ],
    });

    const result = await aiRecRepo.computeRationaleMetrics();

    expect(result).toEqual([
      { factor: 'preference_match', suggested: 4, accepted: 3, acceptance_rate: '0.75' },
      { factor: 'learning_science', suggested: 2, accepted: 1, acceptance_rate: '0.50' },
    ]);
    expect(db.query.mock.calls[0][0]).toContain('jsonb_array_elements');
    expect(db.query.mock.calls[0][0]).toContain('rationale');
  });
});

describe('progress-snapshot.repo', () => {
  test('findByUserAndWeek returns row or null', async () => {
    db.query.mockResolvedValue({ rows: [{ week: '2026-W18' }] });
    expect(await progressRepo.findByUserAndWeek('u1', '2026-W18')).toEqual({ week: '2026-W18' });

    db.query.mockResolvedValue({ rows: [] });
    expect(await progressRepo.findByUserAndWeek('u1', '2026-W18')).toBeNull();
  });

  test('upsert inserts and returns row', async () => {
    db.query.mockResolvedValue({ rows: [{ id: '1' }] });
    const result = await progressRepo.upsert({
      user_id: 'u1', week: '2026-W18', planned_hours: 5, completed_hours: 3, completion_rate: 0.6,
    });
    expect(result).toEqual({ id: '1' });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('ON CONFLICT'), expect.any(Array), undefined);
  });

  test('listTrend with no filters', async () => {
    db.query.mockResolvedValue({ rows: [{ week: '2026-W18' }] });
    const result = await progressRepo.listTrend('u1');
    expect(result).toEqual([{ week: '2026-W18' }]);
    const sql = db.query.mock.calls[0][0];
    expect(sql).not.toContain('week >=');
    expect(sql).not.toContain('week <=');
  });

  test('listTrend with from filter', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await progressRepo.listTrend('u1', { from: '2026-W01' });
    const sql = db.query.mock.calls[0][0];
    expect(sql).toContain('week >=');
  });

  test('listTrend with to filter', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await progressRepo.listTrend('u1', { to: '2026-W18' });
    const sql = db.query.mock.calls[0][0];
    expect(sql).toContain('week <=');
  });

  test('listTrend with both from and to', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await progressRepo.listTrend('u1', { from: '2026-W01', to: '2026-W18' });
    const sql = db.query.mock.calls[0][0];
    expect(sql).toContain('week >=');
    expect(sql).toContain('week <=');
  });
});
