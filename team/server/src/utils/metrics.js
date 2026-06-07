const promClient = require('prom-client');
const logger = require('./logger');

promClient.collectDefaultMetrics();

const register = promClient.register;

const httpRequestCount = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpLatency = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

const aiRequestCount = new promClient.Counter({
  name: 'ai_requests_total',
  help: 'Total AI service requests',
  labelNames: ['type', 'status'],
});

const aiTokensTotal = new promClient.Counter({
  name: 'ai_tokens_total',
  help: 'Total AI tokens consumed by direction',
  labelNames: ['type', 'status', 'provider', 'model', 'direction'],
});

const aiCostUsdTotal = new promClient.Counter({
  name: 'ai_cost_usd_total',
  help: 'Estimated AI cost in USD',
  labelNames: ['type', 'status', 'provider', 'model'],
});

const DEFAULT_PRICING_USD_PER_1M_TOKENS = {
  gemini: {
    default: { input: 0.075, output: 0.30 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  },
  geminiPaid: {
    default: { input: 0.075, output: 0.30 },
  },
  openrouter: {
    default: { input: 0.15, output: 0.60 },
    'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
  },
  glm: {
    default: { input: 0.10, output: 0.10 },
  },
  ollama: {
    default: { input: 0, output: 0 },
  },
  mock: {
    default: { input: 0, output: 0 },
  },
};

const aiUsageSnapshot = {
  totals: {
    requests: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    estimated_cost_usd: 0,
  },
  by_provider_model: {},
};

function _pricingFor(provider, model) {
  const providerPricing = DEFAULT_PRICING_USD_PER_1M_TOKENS[provider] || {};
  return providerPricing[model] || providerPricing.default || { input: 0, output: 0 };
}

function estimateAIUsageCost({ provider = 'unknown', model = 'unknown', promptTokens = 0, completionTokens = 0 }) {
  const pricing = _pricingFor(provider, model);
  const promptCost = (Number(promptTokens) || 0) / 1_000_000 * pricing.input;
  const completionCost = (Number(completionTokens) || 0) / 1_000_000 * pricing.output;
  return Number((promptCost + completionCost).toFixed(10));
}

function _snapshotKey(provider, model) {
  return `${provider}:${model}`;
}

function recordAIUsage({
  type = 'unknown',
  status = 'success',
  provider = 'unknown',
  model = 'unknown',
  promptTokens = 0,
  completionTokens = 0,
  totalTokens,
  latencyMs,
} = {}) {
  const prompt = Number(promptTokens) || 0;
  const completion = Number(completionTokens) || 0;
  const total = Number(totalTokens) || prompt + completion;
  const estimatedCostUsd = estimateAIUsageCost({ provider, model, promptTokens: prompt, completionTokens: completion });

  aiRequestCount.inc({ type, status });
  if (prompt > 0) aiTokensTotal.inc({ type, status, provider, model, direction: 'prompt' }, prompt);
  if (completion > 0) aiTokensTotal.inc({ type, status, provider, model, direction: 'completion' }, completion);
  if (total > 0) aiTokensTotal.inc({ type, status, provider, model, direction: 'total' }, total);
  if (estimatedCostUsd > 0) aiCostUsdTotal.inc({ type, status, provider, model }, estimatedCostUsd);

  aiUsageSnapshot.totals.requests += 1;
  aiUsageSnapshot.totals.prompt_tokens += prompt;
  aiUsageSnapshot.totals.completion_tokens += completion;
  aiUsageSnapshot.totals.total_tokens += total;
  aiUsageSnapshot.totals.estimated_cost_usd = Number((aiUsageSnapshot.totals.estimated_cost_usd + estimatedCostUsd).toFixed(10));

  const key = _snapshotKey(provider, model);
  aiUsageSnapshot.by_provider_model[key] = aiUsageSnapshot.by_provider_model[key] || {
    provider,
    model,
    requests: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    estimated_cost_usd: 0,
  };
  const bucket = aiUsageSnapshot.by_provider_model[key];
  bucket.requests += 1;
  bucket.prompt_tokens += prompt;
  bucket.completion_tokens += completion;
  bucket.total_tokens += total;
  bucket.estimated_cost_usd = Number((bucket.estimated_cost_usd + estimatedCostUsd).toFixed(10));

  const usage = {
    type,
    status,
    provider,
    model,
    prompt_tokens: prompt,
    completion_tokens: completion,
    total_tokens: total,
    estimated_cost_usd: estimatedCostUsd,
    latency_ms: latencyMs,
  };

  logger.info({ event: 'ai_usage', ...usage }, 'AI token usage recorded');
  return usage;
}

function getAIUsageSnapshot() {
  return JSON.parse(JSON.stringify(aiUsageSnapshot));
}

function resetAIUsageForTests() {
  aiRequestCount.reset();
  aiTokensTotal.reset();
  aiCostUsdTotal.reset();
  aiUsageSnapshot.totals = {
    requests: 0,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    estimated_cost_usd: 0,
  };
  aiUsageSnapshot.by_provider_model = {};
}

module.exports = {
  register,
  httpRequestCount,
  httpLatency,
  aiRequestCount,
  aiTokensTotal,
  aiCostUsdTotal,
  estimateAIUsageCost,
  recordAIUsage,
  getAIUsageSnapshot,
  resetAIUsageForTests,
};
