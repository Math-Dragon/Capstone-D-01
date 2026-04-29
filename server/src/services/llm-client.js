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
  return true;
}

async function callGemini(userMessage, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const { modelConfig, contentConfig } = buildGeminiPayload(systemPrompt, userMessage, config.geminiModel);
  const model = genAI.getGenerativeModel(modelConfig);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await model.generateContent(contentConfig, { signal: controller.signal });
    return extractContent('gemini', result);
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenRouter(userMessage, timeoutMs = DEFAULT_TIMEOUT_MS) {
  initSystemPrompt();
  const { url, body } = buildOpenRouterPayload(systemPrompt, userMessage, config.openrouterModel);
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
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

async function callWithRetry(userMessage, { maxRetries = 3, label = 'llm', timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (isMock) {
    throw new Error('llm-client.callWithRetry called while LLM_PROVIDER=mock');
  }

  const attempts = [];

  function makeTracker(source, callFn) {
    return async (attemptNum) => {
      const start = Date.now();
      const meta = { attempt: attemptNum, timestamp: new Date().toISOString(), source };
      try {
        const content = await callFn();
        meta.status = 'success';
        meta.raw_output_preview = content.slice(0, 150);
        meta.duration_ms = Date.now() - start;
        attempts.push(meta);
        return content;
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
      makeTracker('gemini', () => callGemini(userMessage, timeoutMs)),
      { maxAttempts: maxRetries, delayMs: 500, maxDelayMs: 8000, shouldRetry: isRetryable, label: `${label}:gemini` }
    );
    return { content, attempts };
  } catch (primaryErr) {
    if (!hasFallback) {
      primaryErr.attempts = attempts;
      throw primaryErr;
    }

    logger.warn({ err: primaryErr.message, label }, 'Primary LLM failed, falling back to OpenRouter');
    try {
      const content = await withRetry(
        makeTracker('openrouter', () => callOpenRouter(userMessage, timeoutMs)),
        { maxAttempts: maxRetries, delayMs: 500, maxDelayMs: 8000, shouldRetry: isRetryable, label: `${label}:openrouter` }
      );
      return { content, attempts };
    } catch (fallbackErr) {
      fallbackErr.attempts = attempts;
      throw fallbackErr;
    }
  }
}

async function validateGemini() {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const testClient = new GoogleGenerativeAI(config.geminiKey);
  const model = testClient.getGenerativeModel({ model: config.geminiModel });
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
        logger.info({ provider: 'openrouter', model: config.geminiModel }, 'Fallback provider active (primary failed)');
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
