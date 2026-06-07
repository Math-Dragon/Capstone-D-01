jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const {
  estimateAIUsageCost,
  recordAIUsage,
  getAIUsageSnapshot,
  resetAIUsageForTests,
  updateAcceptanceRate,
} = require('../../src/utils/metrics');

beforeEach(() => {
  resetAIUsageForTests();
});

describe('estimateAIUsageCost', () => {
  test('returns 0 for zero tokens', () => {
    const cost = estimateAIUsageCost({ provider: 'gemini', model: 'gemini-2.0-flash', promptTokens: 0, completionTokens: 0 });
    expect(cost).toBe(0);
  });

  test('calculates cost with known provider and model', () => {
    const cost = estimateAIUsageCost({ provider: 'gemini', model: 'gemini-2.0-flash', promptTokens: 1_000_000, completionTokens: 1_000_000 });
    expect(cost).toBe(0.5);
  });

  test('uses default pricing for unknown model', () => {
    const cost = estimateAIUsageCost({ provider: 'gemini', model: 'unknown-model', promptTokens: 1_000_000, completionTokens: 1_000_000 });
    expect(cost).toBe(0.375);
  });

  test('uses fallback pricing for unknown provider', () => {
    const cost = estimateAIUsageCost({ provider: 'unknown', model: 'some-model', promptTokens: 1_000_000, completionTokens: 0 });
    expect(cost).toBe(0);
  });

  test('handles undefined/null tokens safely', () => {
    const cost = estimateAIUsageCost({ provider: 'gemini', model: 'gemini-1.5-flash' });
    expect(cost).toBe(0);
  });
});

describe('recordAIUsage', () => {
  test('records a success usage', () => {
    const usage = recordAIUsage({
      type: 'suggest',
      status: 'success',
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      promptTokens: 100,
      completionTokens: 50,
    });

    expect(usage.type).toBe('suggest');
    expect(usage.status).toBe('success');
    expect(usage.prompt_tokens).toBe(100);
    expect(usage.completion_tokens).toBe(50);
    expect(usage.total_tokens).toBe(150);
    expect(usage.estimated_cost_usd).toBeGreaterThan(0);
  });

  test('records an error usage', () => {
    const usage = recordAIUsage({
      type: 'suggest',
      status: 'error',
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      promptTokens: 50,
    });

    expect(usage.status).toBe('error');
  });

  test('records usage with Ollama provider', () => {
    const usage = recordAIUsage({
      type: 'chat',
      status: 'success',
      provider: 'ollama',
      model: 'llama2',
      promptTokens: 500,
      completionTokens: 200,
    });

    expect(usage.estimated_cost_usd).toBe(0);
  });

  test('updates snapshot totals', () => {
    recordAIUsage({ type: 'suggest', status: 'success', provider: 'gemini', model: 'gemini-2.0-flash', promptTokens: 100, completionTokens: 50 });

    const snapshot = getAIUsageSnapshot();
    expect(snapshot.totals.requests).toBe(1);
    expect(snapshot.totals.prompt_tokens).toBe(100);
    expect(snapshot.totals.completion_tokens).toBe(50);
    expect(snapshot.totals.total_tokens).toBe(150);
  });

  test('maintains snapshot across multiple calls', () => {
    recordAIUsage({ type: 'suggest', status: 'success', provider: 'gemini', model: 'gemini-1.5-flash', promptTokens: 100, completionTokens: 50 });
    recordAIUsage({ type: 'chat', status: 'success', provider: 'gemini', model: 'gemini-1.5-flash', promptTokens: 200, completionTokens: 100 });

    const snapshot = getAIUsageSnapshot();
    expect(snapshot.totals.requests).toBe(2);
    expect(snapshot.totals.total_tokens).toBe(450);
    expect(snapshot.totals.prompt_tokens).toBe(300);
    expect(snapshot.totals.completion_tokens).toBe(150);
  });
});

describe('getAIUsageSnapshot', () => {
  test('returns empty snapshot when no usage recorded', () => {
    const snapshot = getAIUsageSnapshot();
    expect(snapshot.totals.requests).toBe(0);
    expect(snapshot.totals.total_tokens).toBe(0);
    expect(snapshot.totals.estimated_cost_usd).toBe(0);
    expect(snapshot.by_provider_model).toEqual({});
  });

  test('returns snapshot with per-provider breakdown', () => {
    recordAIUsage({ type: 'suggest', status: 'success', provider: 'gemini', model: 'gemini-2.0-flash', promptTokens: 100, completionTokens: 50 });
    recordAIUsage({ type: 'suggest', status: 'success', provider: 'ollama', model: 'llama2', promptTokens: 50, completionTokens: 25 });

    const snapshot = getAIUsageSnapshot();
    expect(Object.keys(snapshot.by_provider_model)).toHaveLength(2);
    expect(snapshot.by_provider_model['gemini:gemini-2.0-flash'].requests).toBe(1);
    expect(snapshot.by_provider_model['ollama:llama2'].requests).toBe(1);
  });
});

describe('updateAcceptanceRate', () => {
  test('sets 0 when total is 0', () => {
    expect(() => updateAcceptanceRate(0, 0)).not.toThrow();
  });

  test('sets 100 when all accepted', () => {
    expect(() => updateAcceptanceRate(5, 0)).not.toThrow();
  });

  test('sets 50 for equal split', () => {
    expect(() => updateAcceptanceRate(5, 5)).not.toThrow();
  });
});

describe('resetAIUsageForTests', () => {
  test('resets all accumulated data', () => {
    recordAIUsage({ type: 'suggest', status: 'success', provider: 'gemini', model: 'gemini-2.0-flash', promptTokens: 100, completionTokens: 50 });
    resetAIUsageForTests();

    const snapshot = getAIUsageSnapshot();
    expect(snapshot.totals.requests).toBe(0);
    expect(snapshot.totals.total_tokens).toBe(0);
    expect(snapshot.by_provider_model).toEqual({});
  });
});
