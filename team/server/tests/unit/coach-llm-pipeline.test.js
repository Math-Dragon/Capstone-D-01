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

  test('retries once with compact prompt after aborted first attempt', async () => {
    const abortError = new Error('This operation was aborted');
    abortError.name = 'AbortError';

    callWithRetry
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce({
        content: JSON.stringify({
          tasks: [
            {
              title: 'Belajar komponen React',
              description: 'Pelajari komponen dasar lalu rangkum poin penting.',
              task_type: 'acquire',
              duration_estimate: 45,
              planned_date: '2026-07-01',
              planned_slot: 'morning',
              rationale: [
                { factor: 'preference_match', explanation: 'Pagi sesuai preferensi belajar utama.' },
              ],
              confidence: 'medium',
            },
            {
              title: 'Latihan props sederhana',
              description: 'Buat komponen kecil dengan props dasar.',
              task_type: 'practice',
              duration_estimate: 45,
              planned_date: '2026-07-03',
              planned_slot: 'morning',
              rationale: [
                { factor: 'sequence_fit', explanation: 'Praktik mengikuti pengenalan konsep inti.' },
              ],
              confidence: 'medium',
            },
            {
              title: 'Refleksi hasil belajar',
              description: 'Tulis poin yang sudah dipahami dan yang masih membingungkan.',
              task_type: 'reflect',
              duration_estimate: 25,
              planned_date: '2026-07-05',
              planned_slot: 'morning',
              rationale: [
                { factor: 'learning_science', explanation: 'Refleksi membantu memperkuat pemahaman baru.' },
              ],
              confidence: 'medium',
            },
          ],
          summary: 'Rencana ringkas tiga langkah untuk mulai belajar React.',
        }),
        attempts: [],
      });

    const result = await callLLM(
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
    );

    expect(result.validated.tasks).toHaveLength(3);
    expect(callWithRetry).toHaveBeenCalledTimes(2);
    expect(callWithRetry.mock.calls[1][0]).toContain('Generate exactly 3 tasks');
  });
});
