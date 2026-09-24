jest.mock('../../src/db', () => ({ query: jest.fn() }));

const db = require('../../src/db');
const repo = require('../../src/repositories/check-in-event.repo');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('checkInEvent.correct', () => {
  test('guards on the integer version and bumps it', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'e1', version: 1 }] });

    const result = await repo.correct('u1', 'e1', { mood: 'good', note: 'ok', version: 0 });

    expect(db.query).toHaveBeenCalledTimes(1);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/version = version \+ 1/);
    expect(sql).toMatch(/AND version = \$3/);
    expect(sql).not.toMatch(/AND updated_at/);
    expect(params.slice(0, 3)).toEqual(['u1', 'e1', 0]);
    expect(result.version).toBe(1);
  });

  test('explicit null mood clears the mood instead of being swallowed', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'e1', mood: null }] });

    await repo.correct('u1', 'e1', { mood: null, version: 2 });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/mood = \$\d/);
    expect(sql).not.toMatch(/COALESCE/);
    expect(params).toContain(null);
  });

  test('note-only correction leaves mood untouched', async () => {
    db.query.mockResolvedValue({ rows: [{ id: 'e1' }] });

    await repo.correct('u1', 'e1', { note: 'fixed', version: 1 });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).not.toMatch(/mood =/);
    expect(sql).toMatch(/note = \$\d/);
    expect(params.slice(0, 3)).toEqual(['u1', 'e1', 1]);
  });

  test('stale version returns null so the service maps it to 409', async () => {
    db.query.mockResolvedValue({ rows: [] });

    await expect(repo.correct('u1', 'e1', { mood: 'good', version: 3 })).resolves.toBeNull();
  });
});

describe('checkInEvent.listByUser cursor', () => {
  test('truncates created_at on both sides of the boundary', async () => {
    db.query.mockResolvedValue({ rows: [] });

    await repo.listByUser('u1', {
      filter: 'all',
      limit: 20,
      cursor: { createdAt: '2026-09-24T10:00:00.123Z', id: 'abc' },
    });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/date_trunc\('milliseconds', e\.created_at\)/);
    expect(sql).toMatch(/ORDER BY date_trunc\('milliseconds', e\.created_at\) DESC, e\.id DESC/);
    expect(params).toEqual(['u1', '2026-09-24T10:00:00.123Z', 'abc', 21]);
  });
});

describe('checkInEvent.countByUser', () => {
  test('bounds use local midnight in the given timezone', async () => {
    db.query.mockResolvedValue({ rows: [{ count: 5 }] });

    const count = await repo.countByUser('u1', {
      from: '2026-09-18', to: '2026-09-25', timezone: 'Asia/Jakarta',
    });

    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/AT TIME ZONE/);
    expect(params).toEqual(['u1', '2026-09-18', '2026-09-25', 'Asia/Jakarta']);
    expect(count).toBe(5);
  });
});
