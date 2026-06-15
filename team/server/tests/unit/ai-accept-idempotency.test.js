jest.mock('../../src/db', () => ({
  withTransaction: jest.fn(async (fn) => fn({})),
  pool: { query: jest.fn(), end: jest.fn() },
}));

jest.mock('../../src/repositories', () => ({
  aiRec: {
    findByIdAndUserId: jest.fn(),
    updateStatus: jest.fn(),
  },
  task: {
    createMany: jest.fn(),
    findByRecommendationId: jest.fn(),
  },
  audit: {
    create: jest.fn(),
  },
}));

const aiService = require('../../src/services/ai.service');
const repos = require('../../src/repositories');

describe('acceptRecommendation idempotency', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns existing tasks when recommendation is already accepted', async () => {
    repos.aiRec.findByIdAndUserId.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440001',
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      goal_id: '550e8400-e29b-41d4-a716-446655440003',
      status: 'accepted',
      output: { tasks: [] },
    });
    repos.task.findByRecommendationId.mockResolvedValue([
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        recommendation_id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Task 1',
      },
    ]);

    const result = await aiService.acceptRecommendation(
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440001'
    );

    expect(result).toEqual([
      expect.objectContaining({
        id: '550e8400-e29b-41d4-a716-446655440004',
        recommendation_id: '550e8400-e29b-41d4-a716-446655440001',
      }),
    ]);
    expect(repos.task.createMany).not.toHaveBeenCalled();
    expect(repos.aiRec.updateStatus).not.toHaveBeenCalled();
    expect(repos.audit.create).not.toHaveBeenCalled();
  });

  test('creates tasks once when recommendation is pending', async () => {
    repos.aiRec.findByIdAndUserId.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440001',
      user_id: '550e8400-e29b-41d4-a716-446655440002',
      goal_id: '550e8400-e29b-41d4-a716-446655440003',
      status: 'pending',
      output: {
        tasks: [
          {
            title: 'Task 1',
            description: 'Desc',
            duration_estimate: 30,
            planned_date: '2026-06-16',
            planned_slot: 'morning',
            rationale: [{ factor: 'fit', explanation: 'Good fit' }],
            confidence: 'medium',
          },
        ],
      },
    });
    repos.task.createMany.mockResolvedValue([
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        recommendation_id: '550e8400-e29b-41d4-a716-446655440001',
      },
    ]);

    const result = await aiService.acceptRecommendation(
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440001'
    );

    expect(repos.task.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          recommendation_id: '550e8400-e29b-41d4-a716-446655440001',
          source: 'ai',
          status: 'todo',
        }),
      ]),
      expect.anything()
    );
    expect(repos.aiRec.updateStatus).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440001',
      'accepted',
      expect.anything()
    );
    expect(result).toEqual([
      expect.objectContaining({ id: '550e8400-e29b-41d4-a716-446655440004' }),
    ]);
  });
});
