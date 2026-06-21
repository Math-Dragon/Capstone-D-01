process.env.SKIP_DB_CHECK = 'true';

jest.mock('../../src/services/llm-client', () => ({
  isMock: false,
  callWithRetry: jest.fn(),
}));

jest.mock('../../src/repositories', () => ({
  user: { findById: jest.fn() },
  profile: { findByUserId: jest.fn() },
  goal: { findByIdAndUserId: jest.fn() },
  task: { findByGoalId: jest.fn(), createMany: jest.fn() },
  cache: { get: jest.fn(), set: jest.fn() },
  aiRec: { create: jest.fn(), findByIdAndUserId: jest.fn(), updateStatus: jest.fn() },
  audit: { create: jest.fn() },
}));

jest.mock('../../src/db', () => ({
  withTransaction: jest.fn(async (fn) => fn({})),
}));

const repos = require('../../src/repositories');
const { callWithRetry } = require('../../src/services/llm-client');
const aiService = require('../../src/services/ai.service');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('aiService.suggestPlan', () => {
  test('sends an explicit suggestion-only schema instruction to the LLM', async () => {
    repos.user.findById.mockResolvedValue({ id: 'u1' });
    repos.profile.findByUserId.mockResolvedValue({ timezone: 'Asia/Jakarta', preferred_time: 'morning', weekly_target_hours: 5 });
    repos.goal.findByIdAndUserId.mockResolvedValue({ id: 'g1', title: 'Learn React', description: 'Basics', deadline: null });
    repos.task.findByGoalId.mockResolvedValue([]);
    repos.cache.get.mockResolvedValue(null);
    repos.cache.set.mockResolvedValue(true);
    repos.aiRec.create.mockResolvedValue({ id: 'rec1' });
    callWithRetry.mockResolvedValue(JSON.stringify({
      tasks: [{
        title: 'Study React components',
        description: 'Read component basics and write notes',
        duration_estimate: 45,
        planned_date: '2026-05-22',
        planned_slot: 'morning',
        rationale: 'Acquire first concepts in the best focus slot',
      }],
      summary: 'Start with component fundamentals.',
    }));

    await aiService.suggestPlan('u1', 'g1', { source: 'test' });

    const prompt = callWithRetry.mock.calls[0][0];
    expect(prompt).toContain('SESSION_TYPE: initial_plan');
    expect(prompt).toContain('"tasks"');
    expect(prompt).toContain('"summary"');
    expect(prompt).toContain('Do not return chat/message/plan wrapper');
  });
});
