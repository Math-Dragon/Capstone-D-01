const mockCallWithRetry = jest.fn();

jest.mock('../../src/services/llm-client', () => ({
  isMock: false,
  callWithRetry: mockCallWithRetry,
  setIsMock: jest.fn(),
}));

jest.mock('../../src/repositories', () => ({
  user: { findById: jest.fn() },
  profile: { findByUserId: jest.fn() },
  goal: { findByIdAndUserId: jest.fn() },
  task: { findByGoalId: jest.fn(), createMany: jest.fn(), findByRecommendationId: jest.fn() },
  cache: { get: jest.fn(), set: jest.fn() },
  aiRec: { create: jest.fn(), findByIdAndUserId: jest.fn(), updateStatus: jest.fn() },
  audit: { create: jest.fn() },
}));

jest.mock('../../src/db', () => ({
  withTransaction: jest.fn(async (fn) => fn({})),
}));

jest.mock('../../src/services/llm-mock', () => ({
  generateMockSuggestion: jest.fn(),
}));

jest.mock('../../src/services/llm', () => ({
  validateAIOutput: jest.fn(),
  SuggestionSchema: { parse: jest.fn() },
}));

const repos = require('../../src/repositories');
const aiService = require('../../src/services/ai.service');

function mockValidContext() {
  repos.user.findById.mockResolvedValue({ id: 'u1', email: 'test@test.com' });
  repos.profile.findByUserId.mockResolvedValue({ timezone: 'Asia/Jakarta', preferred_time: 'morning', weekly_target_hours: 5 });
  repos.goal.findByIdAndUserId.mockResolvedValue({ id: 'g1', title: 'Learn X', description: 'Desc', deadline: null });
  repos.task.findByGoalId.mockResolvedValue([]);
  repos.cache.get.mockResolvedValue(null);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('aiService.suggestPlan error branches', () => {
  test('throws 404 when user not found', async () => {
    repos.user.findById.mockResolvedValue(null);
    await expect(aiService.suggestPlan('u1', 'g1')).rejects.toThrow('User not found');
  });

  test('throws 404 when goal not found', async () => {
    repos.user.findById.mockResolvedValue({ id: 'u1' });
    repos.goal.findByIdAndUserId.mockResolvedValue(null);
    await expect(aiService.suggestPlan('u1', 'g1')).rejects.toThrow('Goal not found');
  });

  test('returns cached recommendation on cache hit', async () => {
    mockValidContext();
    repos.cache.get.mockResolvedValue({ tasks: [{ title: 'Cached task', description: 'Desc', duration_estimate: 30, planned_date: '2026-06-01', planned_slot: 'morning', rationale: 'Test' }], summary: 'Cached plan' });
    repos.aiRec.create.mockResolvedValue({ id: 'rec-cached' });

    const result = await aiService.suggestPlan('u1', 'g1');
    expect(result.fromCache).toBe(true);
    expect(result.recommendationId).toBe('rec-cached');
    expect(mockCallWithRetry).not.toHaveBeenCalled();
  });

  test('throws timeout error on AbortError', async () => {
    mockValidContext();
    const abortError = new Error('Request aborted');
    abortError.name = 'AbortError';
    mockCallWithRetry.mockRejectedValue(abortError);
    await expect(aiService.suggestPlan('u1', 'g1')).rejects.toThrow('timed out');
  });

  test('throws unavailable error on other errors', async () => {
    mockValidContext();
    mockCallWithRetry.mockRejectedValue(new Error('Network error'));
    await expect(aiService.suggestPlan('u1', 'g1')).rejects.toThrow('temporarily unavailable');
  });
});

describe('aiService.acceptRecommendation error branches', () => {
  test('throws 404 when recommendation not found', async () => {
    repos.aiRec.findByIdAndUserId.mockResolvedValue(null);
    await expect(aiService.acceptRecommendation('u1', 'rec1')).rejects.toThrow('Recommendation not found');
  });

  test('throws 409 when already processed', async () => {
    repos.aiRec.findByIdAndUserId.mockResolvedValue({ id: 'rec1', status: 'rejected', output: { tasks: [] } });
    await expect(aiService.acceptRecommendation('u1', 'rec1')).rejects.toThrow('already processed');
  });
});

describe('aiService.rejectRecommendation error branches', () => {
  test('throws 404 when recommendation not found', async () => {
    repos.aiRec.findByIdAndUserId.mockResolvedValue(null);
    await expect(aiService.rejectRecommendation('u1', 'rec1')).rejects.toThrow('Recommendation not found');
  });

  test('rejects successfully when found', async () => {
    repos.aiRec.findByIdAndUserId.mockResolvedValue({ id: 'rec1', status: 'pending', output: { tasks: [] } });
    repos.aiRec.updateStatus.mockResolvedValue({ id: 'rec1', status: 'rejected' });
    const result = await aiService.rejectRecommendation('u1', 'rec1');
    expect(result.status).toBe('rejected');
  });
});
