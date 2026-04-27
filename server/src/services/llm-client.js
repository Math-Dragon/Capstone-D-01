const fs = require('fs');
const path = require('path');
const config = require('../config');
const { withRetry } = require('../utils/retry');
const logger = require('../utils/logger');

const AI_TIMEOUT_MS = 30000;

const isMock = config.llmProvider === 'mock';

let genAI;
let systemPrompt;

if (!isMock) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(config.geminiKey);
  systemPrompt = fs.readFileSync(path.join(__dirname, '../prompts/system-v3.md'), 'utf8');
}

function isRetryable(err) {
  if (err.name === 'AbortError') return false;
  if (err.code === 'AI_OUTPUT_INVALID') return false;
  if (err.statusCode === 401 || err.statusCode === 403) return false;
  if (err.message?.includes('API key')) return false;
  return true;
}

async function callGemini(userMessage) {
  const model = genAI.getGenerativeModel({ model: config.geminiModel });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { responseMimeType: 'application/json' },
      requestOptions: { signal: controller.signal },
    });
    return result.response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function callWithRetry(userMessage, { maxRetries = 3, label = 'llm' } = {}) {
  if (isMock) {
    throw new Error('llm-client.callWithRetry called while LLM_PROVIDER=mock');
  }
  return withRetry(
    () => callGemini(userMessage),
    {
      maxAttempts: maxRetries,
      delayMs: 500,
      maxDelayMs: 8000,
      shouldRetry: isRetryable,
      label,
    }
  );
}

async function validateConnection() {
  if (isMock) {
    return { ok: true, provider: 'mock', message: 'Mock provider active, no validation needed.' };
  }
  try {
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
    logger.info({ provider: config.llmProvider, model: config.geminiModel }, 'Gemini connection validated');
    return { ok: true, provider: 'gemini', model: config.geminiModel };
  } catch (err) {
    logger.error({ err: err.message }, 'Gemini connection validation failed');
    throw err;
  }
}

module.exports = {
  isMock,
  systemPrompt,
  AI_TIMEOUT_MS,
  isRetryable,
  callWithRetry,
  validateConnection,
};
