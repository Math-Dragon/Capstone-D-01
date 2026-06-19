process.env.SKIP_DB_CHECK = 'true';

jest.mock('../../src/services/llm-client', () => ({
  isMock: false,
  callWithRetry: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const { callWithRetry } = require('../../src/services/llm-client');
const { callLLM } = require('../../src/services/coach/llm-pipeline.service');

describe('coach llm pipeline provider error mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('maps provider failure to AI_UNAVAILABLE for coach initial plan', async () => {
    callWithRetry.mockRejectedValue(new Error('Gemini quota exhausted'));

    await expect(
      callLLM(
        {
          sessionType: 'initial_plan',
          payload: {
            goal: { title: 'Belajar React', deadline: '2026-07-15' },
            profile: { weekly_target_hours: 6, preferred_time: 'morning', availability: ['mon', 'wed'] },
          },
          profile: {
            goal: 'Belajar React',
            deadline: '2026-07-15',
            weekly_available_hours: 6,
            preferred_slots: ['morning'],
            available_days: ['mon', 'wed'],
          },
        },
        false
      )
    ).rejects.toMatchObject({
      code: 'AI_UNAVAILABLE',
      statusCode: 503,
      message: 'AI service is temporarily unavailable. Please try again in a moment.',
    });
  });

  test('maps abort failure to AI_TIMEOUT for coach initial plan', async () => {
    const abortError = new Error('This operation was aborted');
    abortError.name = 'AbortError';
    callWithRetry.mockRejectedValue(abortError);

    await expect(
      callLLM(
        {
          sessionType: 'initial_plan',
          payload: {
            goal: { title: 'Belajar React', deadline: '2026-07-15' },
            profile: { weekly_target_hours: 6, preferred_time: 'morning', availability: ['mon', 'wed'] },
          },
          profile: {
            goal: 'Belajar React',
            deadline: '2026-07-15',
            weekly_available_hours: 6,
            preferred_slots: ['morning'],
            available_days: ['mon', 'wed'],
          },
        },
        false
      )
    ).rejects.toMatchObject({
      code: 'AI_TIMEOUT',
      statusCode: 504,
      message: 'AI request timed out. Please try again.',
    });
  });
});
