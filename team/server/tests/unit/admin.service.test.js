jest.mock('../../src/db', () => ({ query: jest.fn() }));
jest.mock('../../src/repositories', () => ({
  aiRec: { computeAllMetrics: jest.fn() },
}));
jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const db = require('../../src/db');
const repos = require('../../src/repositories');
const { getAIUsageSnapshot, resetAIUsageForTests, recordAIUsage } = require('../../src/utils/metrics');
const { getAdminMetrics } = require('../../src/services/admin.service');

function makeRow(overrides = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    user_id: 'u1',
    action: 'COACH_LLM_CALL',
    metadata: { provider: 'gemini', model: 'gemini-2.0-flash', input_tokens: 100, output_tokens: 50, total_tokens: 150, latency_ms: 500, llm: { prompt_tokens: 100, completion_tokens: 50 } },
    created_at: '2026-06-01T00:00:00Z',
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    input_tokens: 100,
    output_tokens: 50,
    total_tokens: 150,
    latency_ms: 500,
    ...overrides,
  };
}

function makeDbRow(overrides = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    user_id: 'u1',
    action: 'COACH_LLM_CALL',
    metadata: { provider: 'gemini', model: 'gemini-2.0-flash', input_tokens: 100, output_tokens: 50, total_tokens: 150, latency_ms: 500 },
    created_at: '2026-06-01T00:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetAIUsageForTests();
  repos.aiRec.computeAllMetrics.mockResolvedValue({ suggested: 10, accepted: 6, rejected: 2, pending: 2 });

  db.query.mockImplementation((sql, params) => {
    if (sql.includes('COUNT(*)::int AS total')) {
      return Promise.resolve({ rows: [{ total: 1 }] });
    }
    if (sql.includes('DATE(created_at)') && sql.includes('audit_logs')) {
      return Promise.resolve({ rows: [{ date: '2026-06-01', requests: 10, errors: 1 }] });
    }
    if (sql.includes('DATE_TRUNC') && sql.includes('audit_logs')) {
      return Promise.resolve({ rows: [{ date: '2026-06-01', requests: 10, errors: 1 }] });
    }
    if (sql.includes('ai_recommendations') && sql.includes('accepted')) {
      return Promise.resolve({ rows: [{ date: '2026-06-01', accepted: 6, decided: 8 }] });
    }
    if (sql.includes('COACH_TASK_ACCEPTED') || (sql.includes('audit_logs') && sql.includes('COACH_TASK_ACCEPTED'))) {
      return Promise.resolve({ rows: [{ date: '2026-06-01', accepted: 4, decided: 5 }] });
    }
    if (sql.includes('SELECT') && sql.includes('audit_logs') && sql.includes('LIMIT')) {
      return Promise.resolve({
        rows: [makeDbRow({
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
          latency_ms: 500,
          provider: 'gemini',
          model: 'gemini-2.0-flash',
        })],
      });
    }
    if (sql.includes('NOW() - INTERVAL') && sql.includes('audit_logs') && sql.includes('COUNT(*) FILTER')) {
      return Promise.resolve({ rows: [{ today_calls: 10, yesterday_calls: 8, today_tokens: 1500, yesterday_tokens: 1200, today_cost: 0.00045, yesterday_cost: 0.00036 }] });
    }
    if (sql.includes('ai_recommendations') && sql.includes('today_decided')) {
      return Promise.resolve({ rows: [{ today_decided: 2, today_accepted: 1, yesterday_decided: 2, yesterday_accepted: 2 }] });
    }
    return Promise.resolve({ rows: [] });
  });
});

describe('getAdminMetrics', () => {
  test('returns expected response shape', async () => {
    const result = await getAdminMetrics({});

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('trends');
    expect(result).toHaveProperty('byProvider');
    expect(result).toHaveProperty('byDay');
    expect(result).toHaveProperty('byDayAccept');
    expect(result).toHaveProperty('recentActivity');
    expect(result).toHaveProperty('total');
  });

  test('summary contains correct fields', async () => {
    recordAIUsage({ type: 'coach.chat', status: 'success', provider: 'gemini', model: 'gemini-2.0-flash', promptTokens: 500, completionTokens: 200, totalTokens: 700, latencyMs: 300 });

    const result = await getAdminMetrics({});

    expect(result.summary).toMatchObject({
      totalCalls: expect.any(Number),
      totalTokens: { prompt: expect.any(Number), completion: expect.any(Number), total: expect.any(Number) },
      estimatedCostUsd: expect.any(Number),
      acceptRate: expect.any(Number),
    });
  });

  test('byDayAccept contains recRate and taskRate', async () => {
    const result = await getAdminMetrics({});

    expect(Array.isArray(result.byDayAccept)).toBe(true);
    if (result.byDayAccept.length > 0) {
      expect(result.byDayAccept[0]).toHaveProperty('date');
      expect(result.byDayAccept[0]).toHaveProperty('recRate');
      expect(result.byDayAccept[0]).toHaveProperty('taskRate');
    }
  });

  test('recentActivity includes extracted metadata fields', async () => {
    const result = await getAdminMetrics({});

    expect(Array.isArray(result.recentActivity)).toBe(true);
    if (result.recentActivity.length > 0) {
      const entry = result.recentActivity[0];
      expect(entry).toHaveProperty('input_tokens');
      expect(entry).toHaveProperty('output_tokens');
      expect(entry).toHaveProperty('total_tokens');
      expect(entry).toHaveProperty('latency_ms');
      expect(entry).toHaveProperty('provider');
      expect(entry).toHaveProperty('model');
    }
  });

  test('handles db.query errors gracefully', async () => {
    db.query.mockRejectedValue(new Error('DB connection lost'));

    const result = await getAdminMetrics({});
    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(Array.isArray(result.recentActivity)).toBe(true);
  });
});

describe('period param', () => {
  beforeEach(() => {
    db.query.mockReset();
    repos.aiRec.computeAllMetrics.mockResolvedValue({ suggested: 0, accepted: 0, rejected: 0, pending: 0 });

    db.query.mockImplementation((sql) => {
      if (sql.includes('COUNT(*)::int AS total')) return Promise.resolve({ rows: [{ total: 0 }] });
      if (sql.includes('LIMIT')) return Promise.resolve({ rows: [] });
      if (sql.includes('COUNT(*) FILTER') && sql.includes('involves_llm')) return Promise.resolve({ rows: [{}] });
      if (sql.includes('today_decided')) return Promise.resolve({ rows: [{}] });
      return Promise.resolve({ rows: [] });
    });
  });

  test('period=7 uses DATE(created_at) and 7-day interval', async () => {
    await getAdminMetrics({ period: 7 });

    const calls = db.query.mock.calls;
    const byDayCall = calls.find(([sql]) => sql.includes('GROUP BY') && sql.includes('audit_logs') && !sql.includes('COACH_TASK'));
    expect(byDayCall).toBeDefined();
    expect(byDayCall[0]).toContain('DATE(created_at)');
    expect(byDayCall[0]).toContain("INTERVAL '7 days'");
  });

  test('period=30 uses DATE(created_at) and 30-day interval', async () => {
    await getAdminMetrics({ period: 30 });

    const calls = db.query.mock.calls;
    const byDayCall = calls.find(([sql]) => sql.includes('GROUP BY') && sql.includes('audit_logs') && !sql.includes('COACH_TASK'));
    expect(byDayCall).toBeDefined();
    expect(byDayCall[0]).toContain('DATE(created_at)');
    expect(byDayCall[0]).toContain("INTERVAL '30 days'");
  });

  test('period=90 uses DATE_TRUNC week and 90-day interval', async () => {
    db.query.mockReset();
    repos.aiRec.computeAllMetrics.mockResolvedValue({ suggested: 0, accepted: 0, rejected: 0, pending: 0 });

    db.query.mockImplementation((sql) => {
      if (sql.includes("DATE_TRUNC('week', created_at)::date") && !sql.includes('COACH_TASK') && !sql.includes('ai_recommendations')) return Promise.resolve({ rows: [] });
      if (sql.includes("DATE_TRUNC") && sql.includes('ai_recommendations')) return Promise.resolve({ rows: [] });
      if (sql.includes('COACH_TASK_ACCEPTED')) return Promise.resolve({ rows: [] });
      if (sql.includes('LIMIT')) return Promise.resolve({ rows: [] });
      if (sql.includes('COUNT(*) FILTER')) return Promise.resolve({ rows: [{}] });
      if (sql.includes('today_decided')) return Promise.resolve({ rows: [{}] });
      if (sql.includes('COUNT(*)::int AS total')) return Promise.resolve({ rows: [{ total: 0 }] });
      return Promise.resolve({ rows: [] });
    });

    await getAdminMetrics({ period: 90 });

    const calls = db.query.mock.calls;
    const byDayCall = calls.find(([sql]) => sql.includes('GROUP BY') && sql.includes('audit_logs') && !sql.includes('COACH_TASK'));
    expect(byDayCall).toBeDefined();
    expect(byDayCall[0]).toContain("DATE_TRUNC('week', created_at)::date");
    expect(byDayCall[0]).toContain("INTERVAL '90 days'");
  });
});
