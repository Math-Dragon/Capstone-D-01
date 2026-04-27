const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

function buildGeminiPayload(systemPrompt, userMessage, model) {
  return {
    modelConfig: {
      model,
      systemInstruction: systemPrompt,
    },
    contentConfig: {
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { responseMimeType: 'application/json' },
    },
  };
}

function buildOpenRouterPayload(systemPrompt, userMessage, model) {
  return {
    url: OPENROUTER_BASE_URL,
    body: {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
    },
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
