jest.mock('../../src/db', () => ({ query: jest.fn() }));
const db = require('../../src/db');
const chatMessageRepo = require('../../src/repositories/chat-message.repo');
const planSnapshotRepo = require('../../src/repositories/plan-snapshot.repo');
const userRepo = require('../../src/repositories/user.repo');
const auditLogRepo = require('../../src/repositories/audit-log.repo');
const profileRepo = require('../../src/repositories/profile.repo');
const refreshTokenRepo = require('../../src/repositories/refresh-token.repo');
const taskRepo = require('../../src/repositories/task.repo');
const goalRepo = require('../../src/repositories/goal.repo');

beforeEach(() => jest.clearAllMocks());

describe('chat-message.repo', () => {
  test('create inserts and returns row', async () => {
    const row = { id: '1', user_id: 'u1', role: 'user', content: 'hi' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await chatMessageRepo.create({ user_id: 'u1', role: 'user', content: 'hi' });
    expect(result).toEqual(row);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT'), expect.any(Array), undefined);
  });

  test('findRecentByUser returns reversed rows', async () => {
    const rows = [{ id: '2' }, { id: '1' }];
    db.query.mockResolvedValue({ rows });
    const result = await chatMessageRepo.findRecentByUser('u1');
    expect(result).toEqual([{ id: '1' }, { id: '2' }]);
  });

  test('findByUser returns rows', async () => {
    const rows = [{ id: '1' }];
    db.query.mockResolvedValue({ rows });
    const result = await chatMessageRepo.findByUser('u1');
    expect(result).toEqual(rows);
  });
});

describe('plan-snapshot.repo', () => {
  test('create inserts and returns row', async () => {
    const row = { id: '1', user_id: 'u1' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await planSnapshotRepo.create({ user_id: 'u1', trigger_id: 't1', adaptation_type: 'type', tasks_snapshot: [] });
    expect(result).toEqual(row);
  });

  test('findLatest returns first row or null', async () => {
    db.query.mockResolvedValue({ rows: [{ id: '1' }] });
    expect(await planSnapshotRepo.findLatest('u1')).toEqual({ id: '1' });

    db.query.mockResolvedValue({ rows: [] });
    expect(await planSnapshotRepo.findLatest('u1')).toBeNull();
  });

  test('remove returns true when row deleted', async () => {
    db.query.mockResolvedValue({ rowCount: 1 });
    expect(await planSnapshotRepo.remove('1')).toBe(true);

    db.query.mockResolvedValue({ rowCount: 0 });
    expect(await planSnapshotRepo.remove('1')).toBe(false);
  });
});

describe('user.repo', () => {
  test('findByEmail returns user or null', async () => {
    db.query.mockResolvedValue({ rows: [{ id: '1' }] });
    expect(await userRepo.findByEmail('a@b.com')).toEqual({ id: '1' });

    db.query.mockResolvedValue({ rows: [] });
    expect(await userRepo.findByEmail('a@b.com')).toBeNull();
  });

  test('findById returns user or null', async () => {
    db.query.mockResolvedValue({ rows: [{ id: '1' }] });
    expect(await userRepo.findById('1')).toEqual({ id: '1' });

    db.query.mockResolvedValue({ rows: [] });
    expect(await userRepo.findById('1')).toBeNull();
  });

  test('findByGoogleId returns user or null', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await userRepo.findByGoogleId('gid')).toBeNull();
  });

  test('updateGoogleId returns updated row', async () => {
    const row = { id: '1', google_id: 'gid' };
    db.query.mockResolvedValue({ rows: [row] });
    expect(await userRepo.updateGoogleId('1', 'gid')).toEqual(row);
  });

  test('create inserts and returns row', async () => {
    const row = { id: '1', email: 'a@b.com' };
    db.query.mockResolvedValue({ rows: [row] });
    expect(await userRepo.create({ email: 'a@b.com', password_hash: 'h' })).toEqual(row);
  });
});

describe('audit-log.repo', () => {
  test('create inserts and returns row', async () => {
    const row = { id: '1', action: 'TASK_COMPLETED' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await auditLogRepo.create({ user_id: 'u1', action: 'TASK_COMPLETED', metadata: {} });
    expect(result).toEqual(row);
  });

  test('findByUserId returns rows', async () => {
    const rows = [{ id: '1' }];
    db.query.mockResolvedValue({ rows });
    expect(await auditLogRepo.findByUserId('u1')).toEqual(rows);
  });

  test('findByUserId with action filter', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await auditLogRepo.findByUserId('u1', { action: 'TASK_COMPLETED' });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('AND action'), expect.any(Array), undefined);
  });

  test('countByAction returns map', async () => {
    db.query.mockResolvedValue({ rows: [{ action: 'LOGIN', count: 5 }, { action: 'LOGOUT', count: 2 }] });
    const result = await auditLogRepo.countByAction('u1');
    expect(result).toEqual({ LOGIN: 5, LOGOUT: 2 });
  });
});

describe('profile.repo', () => {
  test('findByUserId returns profile or null', async () => {
    db.query.mockResolvedValue({ rows: [{ id: '1' }] });
    expect(await profileRepo.findByUserId('u1')).toEqual({ id: '1' });

    db.query.mockResolvedValue({ rows: [] });
    expect(await profileRepo.findByUserId('u1')).toBeNull();
  });

  test('create inserts and returns row', async () => {
    const row = { id: '1', user_id: 'u1' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await profileRepo.create({ user_id: 'u1', timezone: 'Asia/Jakarta', preferred_time: 'morning', weekly_target_hours: 5 });
    expect(result).toEqual(row);
  });

  test('update with fields updates and returns row', async () => {
    const row = { id: '1', timezone: 'UTC' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await profileRepo.update('u1', { timezone: 'UTC' });
    expect(result).toEqual(row);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), expect.any(Array), undefined);
  });

  test('update with no fields falls back to findByUserId', async () => {
    const row = { id: '1' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await profileRepo.update('u1', {});
    expect(result).toEqual(row);
  });
});

describe('refresh-token.repo', () => {
  test('create inserts and returns row', async () => {
    const row = { id: '1', user_id: 'u1' };
    db.query.mockResolvedValue({ rows: [row] });
    expect(await refreshTokenRepo.create({ user_id: 'u1', token_hash: 'h', expires_at: '2026-12-31' })).toEqual(row);
  });

  test('findByTokenHash returns row or null', async () => {
    db.query.mockResolvedValue({ rows: [{ id: '1' }] });
    expect(await refreshTokenRepo.findByTokenHash('hash')).toEqual({ id: '1' });

    db.query.mockResolvedValue({ rows: [] });
    expect(await refreshTokenRepo.findByTokenHash('hash')).toBeNull();
  });

  test('revokeByTokenHash returns boolean', async () => {
    db.query.mockResolvedValue({ rowCount: 1 });
    expect(await refreshTokenRepo.revokeByTokenHash('h')).toBe(true);

    db.query.mockResolvedValue({ rowCount: 0 });
    expect(await refreshTokenRepo.revokeByTokenHash('h')).toBe(false);
  });

  test('revokeAllForUser returns count', async () => {
    db.query.mockResolvedValue({ rowCount: 3 });
    expect(await refreshTokenRepo.revokeAllForUser('u1')).toBe(3);
  });

  test('cleanExpired returns count', async () => {
    db.query.mockResolvedValue({ rowCount: 5 });
    expect(await refreshTokenRepo.cleanExpired()).toBe(5);
  });
});

describe('task.repo', () => {
  test('listByUser with no filters', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 't1' }] });
    const result = await taskRepo.listByUser('u1');
    expect(result).toEqual([{ id: 't1' }]);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE g.user_id = $1'), expect.arrayContaining(['u1']), undefined);
  });

  test('listByUser with goalId filter', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await taskRepo.listByUser('u1', { goalId: 'g1' });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('AND t.goal_id = $2'), expect.arrayContaining(['u1', 'g1']), undefined);
  });

  test('listByUser with status filter', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await taskRepo.listByUser('u1', { status: 'done' });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('AND t.status = $2'), expect.arrayContaining(['u1', 'done']), undefined);
  });

  test('listByUser with limit', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await taskRepo.listByUser('u1', { limit: 10 });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT'), expect.arrayContaining([10]), undefined);
  });

  test('listByUser with limit=0 skips LIMIT', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await taskRepo.listByUser('u1', { limit: 0 });
    const sql = db.query.mock.calls[0][0];
    expect(sql).not.toContain('LIMIT');
  });

  test('listByUser with all filters combined', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await taskRepo.listByUser('u1', { goalId: 'g1', status: 'todo', limit: 5 });
    const sql = db.query.mock.calls[0][0];
    expect(sql).toContain('AND t.goal_id = $2');
    expect(sql).toContain('AND t.status = $3');
    expect(sql).toContain('LIMIT $4');
    expect(db.query).toHaveBeenCalledWith(sql, expect.arrayContaining(['u1', 'g1', 'todo', 5]), undefined);
  });

  test('findByGoalIds returns empty for empty array', async () => {
    const result = await taskRepo.findByGoalIds([]);
    expect(result).toEqual([]);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('findByGoalIds queries for non-empty array', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 't1' }] });
    const result = await taskRepo.findByGoalIds(['g1', 'g2']);
    expect(result).toEqual([{ id: 't1' }]);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('ANY'), [['g1', 'g2']], undefined);
  });

  test('findByGoalId returns rows', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 't1' }] });
    const result = await taskRepo.findByGoalId('g1');
    expect(result).toEqual([{ id: 't1' }]);
  });

  test('findById returns task or null', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 't1' }] });
    expect(await taskRepo.findById('t1')).toEqual({ id: 't1' });

    db.query.mockResolvedValue({ rows: [] });
    expect(await taskRepo.findById('t1')).toBeNull();
  });

  test('findByIdAndUser returns task or null', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 't1' }] });
    expect(await taskRepo.findByIdAndUser('t1', 'u1')).toEqual({ id: 't1' });

    db.query.mockResolvedValue({ rows: [] });
    expect(await taskRepo.findByIdAndUser('t1', 'u1')).toBeNull();
  });

  test('create inserts and returns row', async () => {
    const row = { id: 't1', title: 'Test', status: 'todo', source: 'manual' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await taskRepo.create({ goal_id: 'g1', title: 'Test' });
    expect(result).toEqual(row);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('INSERT'), expect.any(Array), undefined);
  });

  test('createMany returns empty for empty array', async () => {
    const result = await taskRepo.createMany([]);
    expect(result).toEqual([]);
    expect(db.query).not.toHaveBeenCalled();
  });

  test('createMany inserts multiple tasks', async () => {
    const rows = [{ id: 't1' }, { id: 't2' }];
    db.query.mockResolvedValue({ rows });
    const result = await taskRepo.createMany([
      { goal_id: 'g1', title: 'Task 1' },
      { goal_id: 'g1', title: 'Task 2' },
    ]);
    expect(result).toEqual(rows);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('VALUES ($1'), expect.any(Array), undefined);
  });

  test('update with no fields falls back to findById', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 't1' }] });
    const result = await taskRepo.update('t1', {});
    expect(result).toEqual({ id: 't1' });
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith('SELECT * FROM tasks WHERE id = $1', ['t1'], undefined);
  });

  test('update with single field', async () => {
    const row = { id: 't1', title: 'Updated' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await taskRepo.update('t1', { title: 'Updated' });
    expect(result).toEqual(row);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), ['Updated', 't1'], undefined);
  });

  test('update with multiple fields', async () => {
    const row = { id: 't1', title: 'Updated', status: 'done' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await taskRepo.update('t1', { title: 'Updated', status: 'done' });
    expect(result).toEqual(row);
    const callArgs = db.query.mock.calls[0][1];
    expect(callArgs).toContain('Updated');
    expect(callArgs).toContain('done');
    expect(callArgs).toContain('t1');
  });

  test('remove returns true when deleted', async () => {
    db.query.mockResolvedValue({ rowCount: 1 });
    expect(await taskRepo.remove('t1', 'u1')).toBe(true);
  });

  test('remove returns false when not found', async () => {
    db.query.mockResolvedValue({ rowCount: 0 });
    expect(await taskRepo.remove('t1', 'u1')).toBe(false);
  });

  test('findByUserAndWeek returns rows', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 't1' }] });
    const result = await taskRepo.findByUserAndWeek('u1', '2026-W18');
    expect(result).toEqual([{ id: 't1' }]);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('IYYY'), ['u1', '2026-W18'], undefined);
  });

  test('findActiveByUser returns rows', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 't1' }] });
    const result = await taskRepo.findActiveByUser('u1');
    expect(result).toEqual([{ id: 't1' }]);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("IN ('todo', 'in_progress')"), ['u1'], undefined);
  });

  test('countByGoalIds returns empty for empty array', async () => {
    const result = await taskRepo.countByGoalIds([]);
    expect(result).toEqual({});
    expect(db.query).not.toHaveBeenCalled();
  });

  test('countByGoalIds returns map for non-empty array', async () => {
    db.query.mockResolvedValue({ rows: [{ goal_id: 'g1', total: 5, completed: 3 }] });
    const result = await taskRepo.countByGoalIds(['g1']);
    expect(result).toEqual({ g1: { total: 5, completed: 3 } });
  });
});

describe('goal.repo', () => {
  test('list with no filters', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'g1' }] });
    const result = await goalRepo.list('u1');
    expect(result).toEqual([{ id: 'g1' }]);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE user_id = $1'), expect.arrayContaining(['u1']), undefined);
  });

  test('list with status filter', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await goalRepo.list('u1', { status: 'active' });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('AND status = $2'), expect.arrayContaining(['u1', 'active']), undefined);
  });

  test('list with limit', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await goalRepo.list('u1', { limit: 10 });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT'), expect.arrayContaining([10]), undefined);
  });

  test('list with limit=0 skips LIMIT', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await goalRepo.list('u1', { limit: 0 });
    const sql = db.query.mock.calls[0][0];
    expect(sql).not.toContain('LIMIT');
  });

  test('findById returns goal or null', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'g1' }] });
    expect(await goalRepo.findById('g1')).toEqual({ id: 'g1' });

    db.query.mockResolvedValue({ rows: [] });
    expect(await goalRepo.findById('g1')).toBeNull();
  });

  test('findByIdAndUserId returns goal or null', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'g1' }] });
    expect(await goalRepo.findByIdAndUserId('g1', 'u1')).toEqual({ id: 'g1' });

    db.query.mockResolvedValue({ rows: [] });
    expect(await goalRepo.findByIdAndUserId('g1', 'u1')).toBeNull();
  });

  test('create inserts and returns row', async () => {
    const row = { id: 'g1', title: 'Goal', status: 'active' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await goalRepo.create({ user_id: 'u1', title: 'Goal' });
    expect(result).toEqual(row);
  });

  test('create with all fields', async () => {
    const row = { id: 'g1', title: 'Goal', description: 'desc', deadline: '2026-12-31', status: 'active' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await goalRepo.create({ user_id: 'u1', title: 'Goal', description: 'desc', deadline: '2026-12-31', status: 'active' });
    expect(result).toEqual(row);
  });

  test('update with no fields falls back to findByIdAndUserId', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'g1' }] });
    const result = await goalRepo.update('g1', 'u1', {});
    expect(result).toEqual({ id: 'g1' });
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith('SELECT * FROM goals WHERE id = $1 AND user_id = $2', ['g1', 'u1'], undefined);
  });

  test('update with single field', async () => {
    const row = { id: 'g1', title: 'Updated' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await goalRepo.update('g1', 'u1', { title: 'Updated' });
    expect(result).toEqual(row);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), ['Updated', 'g1', 'u1'], undefined);
  });

  test('update with multiple fields', async () => {
    const row = { id: 'g1', title: 'Updated', status: 'completed' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await goalRepo.update('g1', 'u1', { title: 'Updated', status: 'completed' });
    expect(result).toEqual(row);
    const callArgs = db.query.mock.calls[0][1];
    expect(callArgs).toContain('Updated');
    expect(callArgs).toContain('completed');
    expect(callArgs).toContain('g1');
    expect(callArgs).toContain('u1');
  });

  test('remove returns true when deleted', async () => {
    db.query.mockResolvedValue({ rowCount: 1 });
    expect(await goalRepo.remove('g1', 'u1')).toBe(true);
  });

  test('remove returns false when not found', async () => {
    db.query.mockResolvedValue({ rowCount: 0 });
    expect(await goalRepo.remove('g1', 'u1')).toBe(false);
  });
});

describe('profile.repo extended', () => {
  test('update with multiple fields', async () => {
    const row = { id: '1', timezone: 'UTC', preferred_time: 'evening' };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await profileRepo.update('u1', { timezone: 'UTC', preferred_time: 'evening' });
    expect(result).toEqual(row);
    const callArgs = db.query.mock.calls[0][1];
    expect(callArgs).toContain('UTC');
    expect(callArgs).toContain('evening');
    expect(callArgs).toContain('u1');
  });

  test('update with all fields', async () => {
    const row = { id: '1', timezone: 'UTC', preferred_time: 'evening', weekly_target_hours: 10, availability: { mon: 2 } };
    db.query.mockResolvedValue({ rows: [row] });
    const result = await profileRepo.update('u1', { timezone: 'UTC', preferred_time: 'evening', weekly_target_hours: 10, availability: { mon: 2 } });
    expect(result).toEqual(row);
  });
});
