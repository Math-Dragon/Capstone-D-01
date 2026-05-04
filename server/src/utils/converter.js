const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

function buildGeminiPayload(systemPrompt, userMessage, model, temperature) {
  const generationConfig = { responseMimeType: 'application/json' };
  if (temperature !== undefined) generationConfig.temperature = temperature;
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

function buildOpenRouterPayload(systemPrompt, userMessage, model, temperature) {
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
  };
  if (temperature !== undefined) body.temperature = temperature;
  return {
    url: OPENROUTER_BASE_URL,
    body,
  };
}

function extractContent(provider, raw) {
  switch (provider) {
    case 'gemini':
      return raw.response.text();
    case 'openrouter':
      return raw.choices?.[0]?.message?.content;
    default:
      throw new Error(`Unknown provider for extraction: ${provider}`);
  }
}

module.exports = {
  buildGeminiPayload,
  buildOpenRouterPayload,
  extractContent,
  OPENROUTER_BASE_URL,
};
