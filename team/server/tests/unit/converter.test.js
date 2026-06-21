process.env.SKIP_DB_CHECK = 'true';

const {
  buildGeminiPayload,
  buildOaiCompatPayload,
  buildOpenRouterPayload,
  buildGlmPayload,
  buildOllamaPayload,
  extractContent,
  OPENROUTER_BASE_URL,
} = require('../../src/utils/converter');

describe('converter', () => {
  describe('buildGeminiPayload', () => {
    test('builds payload with temperature', () => {
      const result = buildGeminiPayload('sys', 'user', 'model-x', 0.7);
      expect(result.modelConfig).toEqual({ model: 'model-x', systemInstruction: 'sys' });
      expect(result.contentConfig.contents[0]).toEqual({ role: 'user', parts: [{ text: 'user' }] });
      expect(result.contentConfig.generationConfig).toEqual({ responseMimeType: 'application/json', temperature: 0.7 });
    });

    test('builds payload without temperature', () => {
      const result = buildGeminiPayload('sys', 'user', 'model-x');
      expect(result.contentConfig.generationConfig).toEqual({ responseMimeType: 'application/json' });
    });

    test('passes max output tokens when provided', () => {
      const result = buildGeminiPayload('sys', 'user', 'model-x', 0.7, 900);
      expect(result.contentConfig.generationConfig).toEqual({
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 900,
      });
    });
  });

  describe('buildOaiCompatPayload', () => {
    test('builds payload with temperature', () => {
      const result = buildOaiCompatPayload('http://api', 'sys', 'user', 'gpt-4', 0.5);
      expect(result.url).toBe('http://api');
      expect(result.body).toEqual({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'user' },
        ],
        response_format: { type: 'json_object' },
        stream: false,
        temperature: 0.5,
      });
    });

    test('builds payload without temperature', () => {
      const result = buildOaiCompatPayload('http://api', 'sys', 'user', 'gpt-4');
      expect(result.body.temperature).toBeUndefined();
    });

    test('passes max_tokens when provided', () => {
      const result = buildOaiCompatPayload('http://api', 'sys', 'user', 'gpt-4', 0.5, 700);
      expect(result.body.max_tokens).toBe(700);
    });
  });

  describe('buildOpenRouterPayload', () => {
    test('adds thinking disabled to oai compat payload', () => {
      const result = buildOpenRouterPayload('sys', 'user', 'or-model', 0.3);
      expect(result.url).toBe(OPENROUTER_BASE_URL);
      expect(result.body.thinking).toEqual({ type: 'disabled' });
      expect(result.body.model).toBe('or-model');
    });
  });

  describe('buildGlmPayload', () => {
    test('adds thinking disabled with custom url', () => {
      const result = buildGlmPayload('http://glm-api', 'sys', 'user', 'glm-4', 0.2);
      expect(result.url).toBe('http://glm-api');
      expect(result.body.thinking).toEqual({ type: 'disabled' });
      expect(result.body.temperature).toBe(0.2);
    });
  });

  describe('buildOllamaPayload', () => {
    test('builds payload without url', () => {
      const result = buildOllamaPayload('sys', 'user', 'llama3', 0.8);
      expect(result.body).toEqual({
        model: 'llama3',
        messages: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'user' },
        ],
        stream: false,
        temperature: 0.8,
      });
      expect(result.url).toBeUndefined();
    });

    test('builds payload without temperature', () => {
      const result = buildOllamaPayload('sys', 'user', 'llama3');
      expect(result.body.temperature).toBeUndefined();
    });
  });

  describe('extractContent', () => {
    test('extracts from gemini provider', () => {
      const raw = { response: { text: () => 'gemini content' } };
      expect(extractContent('gemini', raw)).toBe('gemini content');
    });

    test('extracts from openrouter provider', () => {
      const raw = { choices: [{ message: { content: 'or content' } }] };
      expect(extractContent('openrouter', raw)).toBe('or content');
    });

    test('extracts from glm provider', () => {
      const raw = { choices: [{ message: { content: 'glm content' } }] };
      expect(extractContent('glm', raw)).toBe('glm content');
    });

    test('extracts from ollama provider', () => {
      const raw = { choices: [{ message: { content: 'ollama content' } }] };
      expect(extractContent('ollama', raw)).toBe('ollama content');
    });

    test('falls back to reasoning when content is missing', () => {
      const raw = { choices: [{ message: { reasoning: 'reasoned' } }] };
      expect(extractContent('openrouter', raw)).toBe('reasoned');
    });

    test('returns null when no content or reasoning', () => {
      const raw = { choices: [{ message: {} }] };
      expect(extractContent('openrouter', raw)).toBeNull();
    });

    test('throws for unknown provider', () => {
      expect(() => extractContent('unknown', {})).toThrow('Unknown provider for extraction: unknown');
    });
  });
});
