const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

function _schemaForPayload(responseSchema) {
  if (!responseSchema) return { type: 'json_object' };
  return {
    type: 'json_schema',
    json_schema: { name: 'Plan', schema: responseSchema },
  };
}

function buildGeminiPayload(systemPrompt, userMessage, model, temperature, responseSchema) {
  const generationConfig = { responseMimeType: 'application/json' };
  if (temperature !== undefined) generationConfig.temperature = temperature;
  if (responseSchema) generationConfig.responseSchema = responseSchema;
  return {
    modelConfig: {
      model,
      systemInstruction: systemPrompt,
    },
    contentConfig: {
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig,
    },
  };
}

function buildOaiCompatPayload(url, systemPrompt, userMessage, model, temperature, responseSchema) {
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: _schemaForPayload(responseSchema),
    stream: false,
  };
  if (temperature !== undefined) body.temperature = temperature;
  return { url, body };
}

function buildOpenRouterPayload(systemPrompt, userMessage, model, temperature, responseSchema) {
  const result = buildOaiCompatPayload(OPENROUTER_BASE_URL, systemPrompt, userMessage, model, temperature, responseSchema);
  result.body.thinking = { type: 'disabled' };
  return result;
}

function buildGlmPayload(url, systemPrompt, userMessage, model, temperature, responseSchema) {
  const result = buildOaiCompatPayload(url, systemPrompt, userMessage, model, temperature, responseSchema);
  result.body.thinking = { type: 'disabled' };
  return result;
}

function buildOllamaPayload(systemPrompt, userMessage, model, temperature, _responseSchema) {
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    stream: false,
  };
  if (temperature !== undefined) body.temperature = temperature;
  return { body };
}

function extractContent(provider, raw) {
  switch (provider) {
    case 'gemini':
      return raw.response.text();
    case 'openrouter':
    case 'glm':
    case 'ollama':
      return raw.choices?.[0]?.message?.content || raw.choices?.[0]?.message?.reasoning || null;
    default:
      throw new Error(`Unknown provider for extraction: ${provider}`);
  }
}

module.exports = {
  buildGeminiPayload,
  buildOaiCompatPayload,
  buildOpenRouterPayload,
  buildGlmPayload,
  buildOllamaPayload,
  extractContent,
  OPENROUTER_BASE_URL,
};
