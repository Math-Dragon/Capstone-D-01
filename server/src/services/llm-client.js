const fs = require('fs');
const path = require('path');
const config = require('../config');
const { withRetry } = require('../utils/retry');
const { buildGeminiPayload, buildOpenRouterPayload, extractContent } = require('../utils/converter');
const logger = require('../utils/logger');

const DEFAULT_TIMEOUT_MS = 60000;

const hasFallback = !!(config.openrouterKey && config.openrouterModel);

let isMock = config.llmProvider === 'mock';

let genAI;
let systemPrompt;

function initGemini() {
  if (genAI) return;
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(config.geminiKey);
  systemPrompt = fs.readFileSync(path.join(__dirname, '../prompts/system-v3.md'), 'utf8');
}

function initSystemPrompt() {
  if (systemPrompt) return;
  systemPrompt = fs.readFileSync(path.join(__dirname, '../prompts/system-v3.md'), 'utf8');
}

if (!isMock) {
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

async function callGemini(userMessage, timeoutMs = DEFAULT_TIMEOUT_MS, temperature) {
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

async function callOpenRouter(userMessage, timeoutMs = DEFAULT_TIMEOUT_MS, temperature) {
  initSystemPrompt();
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

async function callWithRetry(userMessage, { maxRetries = 3, label = 'llm', timeoutMs = DEFAULT_TIMEOUT_MS, temperature } = {}) {
  if (isMock) {
    throw new Error('llm-client.callWithRetry called while LLM_PROVIDER=mock');
  }

  const attempts = [];

  function makeTracker(source, callFn) {
    return async (attemptNum) => {
      const start = Date.now();
      const meta = { attempt: attemptNum, timestamp: new Date().toISOString(), source };
      try {
        const result = await callFn();
        meta.status = 'success';
        meta.raw_output_preview = result.content.slice(0, 150);
        meta.duration_ms = Date.now() - start;
        if (result.usage) {
          meta.usage = result.usage;
        }
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

  try {
    const content = await withRetry(
      makeTracker('gemini', () => callGemini(userMessage, timeoutMs, temperature)),
      { maxAttempts: maxRetries, delayMs: 500, maxDelayMs: 8000, shouldRetry: isRetryable, label: `${label}:gemini` }
    );
    return { content, attempts };
  } catch (primaryErr) {
    if (!hasFallback) {
      primaryErr.attempts = attempts;
      throw primaryErr;
    }

    const isQuota = primaryErr.statusCode === 429 || primaryErr.message?.includes('429');
    logger.warn({ err: primaryErr.message, label, isQuota }, 'Primary LLM failed, falling back to OpenRouter');
    try {
      const content = await withRetry(
        makeTracker('openrouter', () => callOpenRouter(userMessage, timeoutMs, temperature)),
        { maxAttempts: maxRetries, delayMs: isQuota ? 10000 : 500, maxDelayMs: 30000, shouldRetry: () => true, label: `${label}:openrouter` }
      );
      return { content, attempts };
    } catch (fallbackErr) {
      fallbackErr.attempts = attempts;
      throw fallbackErr;
    }
  }
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

async function validateOpenRouter() {
  initSystemPrompt();
  const { url, body } = buildOpenRouterPayload(
    'Respond with valid JSON.',
    'Say ok',
    config.openrouterModel
  );
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

async function validateConnection() {
  if (isMock) {
    return { ok: true, provider: 'mock', message: 'Mock provider active, no validation needed.' };
  }

  try {
    const result = await validateGemini();
    logger.info({ provider: 'gemini', model: config.geminiModel }, 'Gemini connection validated');
    if (hasFallback) {
      try {
        await validateOpenRouter();
        logger.info({ provider: 'openrouter', model: config.openrouterModel }, 'OpenRouter fallback validated');
      } catch (fbErr) {
        logger.warn({ err: fbErr.message }, 'OpenRouter fallback validation failed — primary only');
      }
    }
    return result;
  } catch (geminiErr) {
    logger.error({ err: geminiErr.message }, 'Gemini connection validation failed');

    if (hasFallback) {
      try {
        const fbResult = await validateOpenRouter();
        logger.info({ provider: 'openrouter', model: config.openrouterModel }, 'Fallback provider active (primary failed)');
        return { ...fbResult, primaryFailed: true };
      } catch (fbErr) {
        logger.error({ err: fbErr.message }, 'OpenRouter fallback also failed');
        const combined = new Error(`Both providers failed. Gemini: ${geminiErr.message} | OpenRouter: ${fbErr.message}`);
        throw combined;
      }
    }

    throw geminiErr;
  }
}

module.exports = {
  get isMock() { return isMock; },
  setIsMock,
  get hasFallback() { return hasFallback; },
  systemPrompt,
  DEFAULT_TIMEOUT_MS,
  isRetryable,
  callWithRetry,
  validateConnection,
};
