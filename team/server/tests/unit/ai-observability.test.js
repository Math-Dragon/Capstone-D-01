jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const logger = require('../../src/utils/logger');
const request = require('supertest');
const app = require('../../src/app');
const {
  register,
  recordAIUsage,
  getAIUsageSnapshot,
  resetAIUsageForTests,
} = require('../../src/utils/metrics');

describe('AI observability metrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAIUsageForTests();
  });

  test('tracks AI token usage and estimated cost per provider/model', () => {
    const usage = recordAIUsage({
      type: 'coach.chat',
      status: 'success',
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      promptTokens: 1000,
      completionTokens: 500,
    });

    expect(usage).toEqual(expect.objectContaining({
      prompt_tokens: 1000,
      completion_tokens: 500,
      total_tokens: 1500,
      estimated_cost_usd: expect.any(Number),
    }));
    expect(usage.estimated_cost_usd).toBeGreaterThan(0);

    const snapshot = getAIUsageSnapshot();
    expect(snapshot.totals).toEqual(expect.objectContaining({
      requests: 1,
      prompt_tokens: 1000,
      completion_tokens: 500,
      total_tokens: 1500,
    }));
    expect(snapshot.totals.estimated_cost_usd).toBeCloseTo(usage.estimated_cost_usd, 8);
  });

  test('logs token usage and estimated cost for AI requests', () => {
    recordAIUsage({
      type: 'ai.suggestPlan',
      status: 'success',
      provider: 'openrouter',
      model: 'openai/gpt-4o-mini',
      promptTokens: 1200,
      completionTokens: 300,
    });

    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ai_usage',
        type: 'ai.suggestPlan',
        provider: 'openrouter',
        model: 'openai/gpt-4o-mini',
        prompt_tokens: 1200,
        completion_tokens: 300,
        total_tokens: 1500,
        estimated_cost_usd: expect.any(Number),
      }),
      'AI token usage recorded'
    );
  });

  test('publishes AI token and cost metrics on the Prometheus registry', async () => {
    recordAIUsage({
      type: 'coach.initial_plan',
      status: 'success',
      provider: 'glm',
      model: 'glm-4-flash',
      promptTokens: 800,
      completionTokens: 200,
    });

    const metrics = await register.metrics();

    expect(metrics).toContain('ai_tokens_total');
    expect(metrics).toContain('ai_cost_usd_total');
    expect(metrics).toContain('type="coach.initial_plan"');
    expect(metrics).toContain('provider="glm"');
    expect(metrics).toContain('direction="prompt"');
    expect(metrics).toContain('direction="completion"');
  });

  test('serves AI metrics from the /metrics endpoint', async () => {
    recordAIUsage({
      type: 'coach.chat',
      status: 'success',
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      promptTokens: 600,
      completionTokens: 150,
    });

    const response = await request(app).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.text).toContain('ai_tokens_total');
    expect(response.text).toContain('ai_cost_usd_total');
    expect(response.text).toContain('type="coach.chat"');
  });
});
