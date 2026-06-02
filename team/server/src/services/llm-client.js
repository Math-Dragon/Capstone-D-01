const fs = require('fs');
const path = require('path');
const config = require('../config');
const { withRetry } = require('../utils/retry');
const { buildGeminiPayload, buildOpenRouterPayload, buildGlmPayload, buildOllamaPayload, extractContent } = require('../utils/converter');
const logger = require('../utils/logger');

const DEFAULT_TIMEOUT_MS = 30000;

let isMock = config.llmProvider === 'mock';
let _gemini429 = false;
let _geminiPaid429 = false;
let _glmCooldownUntil = 0;
let _openrouterCooldownUntil = 0;

function _onCooldown(ts) { return Date.now() < ts; }
function _startCooldown() { return Date.now() + 60000; }
function _clearCooldown() { return 0; }

let genAI;
let genAIPaid;
let systemPrompt;

function _loadSystemPrompt() {
  if (!systemPrompt) {
    systemPrompt = fs.readFileSync(path.join(__dirname, '../prompts/system-final.md'), 'utf8');
  }
}

function initGemini() {
  if (genAI) return;
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(config.geminiKey);
  _loadSystemPrompt();
}

function initGeminiPaid() {
  if (genAIPaid) return;
  if (!config.geminiPaidKey) return;
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAIPaid = new GoogleGenerativeAI(config.geminiPaidKey);
  _loadSystemPrompt();
}

if (!isMock && config.llmProvider === 'gemini') {
  initGemini();
}

function setIsMock(value) {
  isMock = !!value;
}

function isRetryable(err) {
  if (err.name === 'AbortError') return false;
  if (err.code === 'AI_OUTPUT_INVALID') return false;
  if (err.statusCode === 401 || err.statusCode === 403) return false;
  if (err.message?.includes('API key')) return false;
  if (err.statusCode === 429 || err.status === 429) return false;
  if (err.message?.includes('429 Too Many Requests')) return false;
  return true;
}

function _is429(err) {
  return err.statusCode === 429 || err.status === 429 || err.message?.includes('429');
}

function _genOllamaUrl() {
  return `${config.ollamaBaseUrl}/v1/chat/completions`;
}

async function callGemini(userMessage, timeoutMs = DEFAULT_TIMEOUT_MS, temperature) {
  initGemini();
  const { modelConfig, contentConfig } = buildGeminiPayload(systemPrompt, userMessage, config.geminiModel, temperature);
  const model = genAI.getGenerativeModel(modelConfig);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await model.generateContent(contentConfig, { signal: controller.signal });
    const content = extractContent('gemini', result);
    const usage = result.response.usageMetadata ? {
      prompt_tokens: result.response.usageMetadata.promptTokenCount,
      completion_tokens: result.response.usageMetadata.candidatesTokenCount,
      total_tokens: result.response.usageMetadata.totalTokenCount,
    } : null;
    return { content, usage };
  } finally {
    clearTimeout(timeout);
  }
}

async function callGeminiPaid(userMessage, timeoutMs = DEFAULT_TIMEOUT_MS, temperature) {
  initGeminiPaid();
  if (!genAIPaid) throw new Error('Gemini Paid not configured');
  const { modelConfig, contentConfig } = buildGeminiPayload(systemPrompt, userMessage, config.geminiPaidModel, temperature);
  const model = genAIPaid.getGenerativeModel(modelConfig);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await model.generateContent(contentConfig, { signal: controller.signal });
    const content = extractContent('gemini', result);
    const usage = result.response.usageMetadata ? {
      prompt_tokens: result.response.usageMetadata.promptTokenCount,
      completion_tokens: result.response.usageMetadata.candidatesTokenCount,
      total_tokens: result.response.usageMetadata.totalTokenCount,
    } : null;
    return { content, usage };
  } finally {
    clearTimeout(timeout);
  }
}

async function callGlm(userMessage, timeoutMs = DEFAULT_TIMEOUT_MS, temperature) {
  _loadSystemPrompt();
  const { url, body } = buildGlmPayload(config.glmBaseUrl, systemPrompt, userMessage, config.glmModel, temperature);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.glmKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const detail = await resp.text();
      const err = new Error(`GLM ${resp.status}: ${detail}`);
      err.statusCode = resp.status;
      throw err;
    }
    const raw = await resp.json();
    const content = extractContent('glm', raw);
    if (!content) throw new Error('GLM returned empty content');
    const usage = raw.usage ? {
      prompt_tokens: raw.usage.prompt_tokens,
      completion_tokens: raw.usage.completion_tokens,
      total_tokens: raw.usage.total_tokens,
    } : null;
    return { content, usage };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenRouter(userMessage, timeoutMs = DEFAULT_TIMEOUT_MS, temperature) {
  _loadSystemPrompt();
  const { url, body } = buildOpenRouterPayload(systemPrompt, userMessage, config.openrouterModel, temperature);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openrouterKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const detail = await resp.text();
      const err = new Error(`OpenRouter ${resp.status}: ${detail}`);
      err.statusCode = resp.status;
      throw err;
    }
    const raw = await resp.json();
    const content = extractContent('openrouter', raw);
    if (!content) throw new Error('OpenRouter returned empty content');
    const usage = raw.usage ? {
      prompt_tokens: raw.usage.prompt_tokens,
      completion_tokens: raw.usage.completion_tokens,
      total_tokens: raw.usage.total_tokens,
    } : null;
    return { content, usage };
  } finally {
    clearTimeout(timeout);
  }
}

async function callOllama(userMessage, timeoutMs = DEFAULT_TIMEOUT_MS, temperature) {
  _loadSystemPrompt();
  const { body } = buildOllamaPayload(systemPrompt, userMessage, config.ollamaModel, temperature);
  const url = _genOllamaUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) {
      const detail = await resp.text();
      const err = new Error(`Ollama ${resp.status}: ${detail}`);
      err.statusCode = resp.status;
      throw err;
    }
    const raw = await resp.json();
    const content = extractContent('ollama', raw);
    if (!content) throw new Error('Ollama returned empty content');
    const usage = raw.usage ? {
      prompt_tokens: raw.usage.prompt_tokens,
      completion_tokens: raw.usage.completion_tokens,
      total_tokens: raw.usage.total_tokens,
    } : null;
    return { content, usage };
  } finally {
    clearTimeout(timeout);
  }
}

async function callWithRetry(userMessage, { maxRetries = 1, label = 'llm', timeoutMs = DEFAULT_TIMEOUT_MS, temperature } = {}) {
  if (isMock) {
    throw new Error('llm-client.callWithRetry called while LLM_PROVIDER=mock');
  }

  const attempts = [];

  function makeTracker(source, model, callFn) {
    return async (attemptNum) => {
      const start = Date.now();
      const meta = { attempt: attemptNum, timestamp: new Date().toISOString(), source, model };
      try {
        const result = await callFn();
        meta.status = 'success';
        meta.raw_output_preview = result.content.slice(0, 150);
        meta.duration_ms = Date.now() - start;
        if (result.usage) meta.usage = result.usage;
        attempts.push(meta);
        return result.content;
      } catch (err) {
        meta.status = 'transient_error';
        meta.error = err.message;
        meta.duration_ms = Date.now() - start;
        attempts.push(meta);
        throw err;
      }
    };
  }

  if (config.llmProvider === 'ollama') {
    const content = await withRetry(
      makeTracker('ollama', config.ollamaModel, () => callOllama(userMessage, timeoutMs, temperature)),
      { maxAttempts: maxRetries, delayMs: 500, maxDelayMs: 8000, shouldRetry: isRetryable, label: `${label}:ollama` }
    );
    return { content, attempts };
  }

  const providers = [
    { name: 'gemini',     model: config.geminiModel,     call: callGemini,     get429: () => _gemini429,     set429: (v) => { _gemini429 = v; },     key: config.geminiKey },
    { name: 'geminiPaid', model: config.geminiPaidModel, call: callGeminiPaid,  get429: () => _geminiPaid429, set429: (v) => { _geminiPaid429 = v; }, key: config.geminiPaidKey },
    { name: 'glm',        model: config.glmModel,        call: callGlm,         get429: () => _onCooldown(_glmCooldownUntil),        set429: (v) => { _glmCooldownUntil = v ? _startCooldown() : _clearCooldown(); },        key: config.glmKey,        timeout: 45000 },
    { name: 'openrouter', model: config.openrouterModel, call: callOpenRouter,   get429: () => _onCooldown(_openrouterCooldownUntil), set429: (v) => { _openrouterCooldownUntil = v ? _startCooldown() : _clearCooldown(); }, key: config.openrouterKey, timeout: 45000 },
  ];

  let lastErr;
  for (const provider of providers) {
    if (!provider.key) continue;
    if (provider.get429()) {
      logger.info({ label, provider: provider.name }, 'Circuit breaker active — skipping');
      continue;
    }
    try {
      const effectiveTimeout = provider.timeout || timeoutMs;
      const content = await withRetry(
        makeTracker(provider.name, provider.model, () => provider.call(userMessage, effectiveTimeout, temperature)),
        { maxAttempts: maxRetries, delayMs: 500, maxDelayMs: 8000, shouldRetry: isRetryable, label: `${label}:${provider.name}` }
      );
      return { content, attempts };
    } catch (err) {
      lastErr = err;
      if (_is429(err)) {
        provider.set429(true);
        logger.warn({ label, provider: provider.name }, '429 — circuit breaker active');
      }
      logger.warn({ err: err.message, label, provider: provider.name }, 'Provider failed, trying next');
    }
  }

  lastErr = lastErr || new Error('All LLM providers failed or unavailable');
  lastErr.attempts = attempts;
  throw lastErr;
}

async function validateGemini() {
  if (!genAI) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(config.geminiKey);
  }
  const model = genAI.getGenerativeModel({ model: config.geminiModel });
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: 'Respond with only the word: ok' }] }],
    generationConfig: { maxOutputTokens: 10 },
  });
  const text = result.response.text().trim().toLowerCase();
  if (!text.includes('ok')) {
    throw new Error(`Unexpected Gemini response: "${text}"`);
  }
  return { ok: true, provider: 'gemini', model: config.geminiModel };
}

async function validateGeminiPaid() {
  initGeminiPaid();
  if (!genAIPaid) throw new Error('Gemini Paid not configured');
  const model = genAIPaid.getGenerativeModel({ model: config.geminiPaidModel });
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: 'Respond with only the word: ok' }] }],
    generationConfig: { maxOutputTokens: 10 },
  });
  const text = result.response.text().trim().toLowerCase();
  if (!text.includes('ok')) {
    throw new Error(`Unexpected Gemini Paid response: "${text}"`);
  }
  return { ok: true, provider: 'geminiPaid', model: config.geminiPaidModel };
}

async function validateGlm() {
  _loadSystemPrompt();
  const { url, body } = buildGlmPayload(config.glmBaseUrl, 'Respond with valid JSON.', 'Say ok', config.glmModel);
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.glmKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`GLM validation ${resp.status}: ${detail}`);
  }
  const raw = await resp.json();
  const content = extractContent('glm', raw);
  if (!content) throw new Error('GLM returned empty content');
  return { ok: true, provider: 'glm', model: config.glmModel };
}

async function validateOpenRouter() {
  _loadSystemPrompt();
  const { url, body } = buildOpenRouterPayload('Respond with valid JSON.', 'Say ok', config.openrouterModel);
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openrouterKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`OpenRouter validation ${resp.status}: ${detail}`);
  }
  const raw = await resp.json();
  const content = extractContent('openrouter', raw);
  if (!content) throw new Error('OpenRouter returned empty content');
  return { ok: true, provider: 'openrouter', model: config.openrouterModel };
}

async function validateOllama() {
  const url = _genOllamaUrl();
  const body = {
    model: config.ollamaModel,
    messages: [
      { role: 'user', content: 'Respond with only the word: ok' },
    ],
    stream: false,
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const detail = await resp.text();
    throw new Error(`Ollama validation ${resp.status}: ${detail}`);
  }
  const raw = await resp.json();
  const content = extractContent('ollama', raw);
  if (!content) throw new Error('Ollama returned empty content');
  return { ok: true, provider: 'ollama', model: config.ollamaModel };
}

async function validateConnection() {
  if (isMock) {
    return { ok: true, provider: 'mock', message: 'Mock provider active, no validation needed.' };
  }

  if (config.llmProvider === 'ollama') {
    const result = await validateOllama();
    logger.info({ provider: 'ollama', model: config.ollamaModel }, 'Ollama connection validated');
    return result;
  }

  const validators = [
    { name: 'gemini',     fn: validateGemini,     key: config.geminiKey,     on429: () => { _gemini429 = true; } },
    { name: 'geminiPaid', fn: validateGeminiPaid,  key: config.geminiPaidKey, on429: () => { _geminiPaid429 = true; } },
    { name: 'glm',        fn: validateGlm,         key: config.glmKey,        on429: () => { _glmCooldownUntil = _startCooldown(); } },
    { name: 'openrouter', fn: validateOpenRouter,   key: config.openrouterKey, on429: () => { _openrouterCooldownUntil = _startCooldown(); } },
  ];

  const errors = [];
  for (const v of validators) {
    if (!v.key) continue;
    try {
      const result = await v.fn();
      logger.info({ provider: v.name, model: result.model }, `${v.name} connection validated`);
      return result;
    } catch (err) {
      if (_is429(err)) {
        v.on429();
        logger.warn({ provider: v.name }, '429 during validation — circuit breaker active');
      }
      errors.push(`${v.name}: ${err.message}`);
      logger.warn({ err: err.message, provider: v.name }, `${v.name} validation failed`);
    }
  }

  throw new Error(`All LLM providers failed validation: ${errors.join(' | ')}`);
}

module.exports = {
  get isMock() { return isMock; },
  setIsMock,
  get hasFallback() { return config.hasFallback; },
  systemPrompt,
  DEFAULT_TIMEOUT_MS,
  isRetryable,
  callWithRetry,
  validateConnection,
};
