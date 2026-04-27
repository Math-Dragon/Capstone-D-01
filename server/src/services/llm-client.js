const fs = require('fs');
const path = require('path');
const config = require('../config');
const { withRetry } = require('../utils/retry');
const { buildGeminiPayload, buildOpenRouterPayload, extractContent } = require('../utils/converter');
const logger = require('../utils/logger');

const AI_TIMEOUT_MS = 30000;

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

async function callGemini(userMessage) {
  const { modelConfig, contentConfig } = buildGeminiPayload(systemPrompt, userMessage, config.geminiModel);
  const model = genAI.getGenerativeModel(modelConfig);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const result = await model.generateContent({
      ...contentConfig,
      requestOptions: { signal: controller.signal },
    });
    return extractContent('gemini', result);
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenRouter(userMessage) {
  initSystemPrompt();
  const { url, body } = buildOpenRouterPayload(systemPrompt, userMessage, config.openrouterModel);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

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

async function callWithRetry(userMessage, { maxRetries = 3, label = 'llm' } = {}) {
  if (isMock) {
    throw new Error('llm-client.callWithRetry called while LLM_PROVIDER=mock');
  }

  try {
    return await withRetry(
      () => callGemini(userMessage),
      {
        maxAttempts: maxRetries,
        delayMs: 500,
        maxDelayMs: 8000,
        shouldRetry: isRetryable,
        label: `${label}:gemini`,
      }
    );
  } catch (primaryErr) {
    if (!hasFallback) throw primaryErr;

    logger.warn({ err: primaryErr.message, label }, 'Primary LLM failed, falling back to OpenRouter');
    return withRetry(
      () => callOpenRouter(userMessage),
      {
        maxAttempts: maxRetries,
        delayMs: 500,
        maxDelayMs: 8000,
        shouldRetry: isRetryable,
        label: `${label}:openrouter`,
      }
    );
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
  AI_TIMEOUT_MS,
  isRetryable,
  callWithRetry,
  validateConnection,
};
