const { generateMockSuggestion, generateMockChat } = require('../../src/services/llm-mock');

function makeContext(overrides = {}) {
  return {
    user_id: 'mock-user-id',
    goal_id: 'mock-goal-id',
    profile: {
      goal: 'Learn React Fundamentals',
      deadline: '2026-06-30',
      preferred_slots: ['morning'],
      weekly_available_hours: 5.0,
    },
    ...overrides,
  };
}

describe('generateMockSuggestion', () => {
  test('returns valid schema-conforming output', () => {
    const result = generateMockSuggestion(makeContext());
    expect(result.tasks.length).toBeGreaterThanOrEqual(2);
    expect(result.tasks.length).toBeLessThanOrEqual(5);
    expect(result.summary).toContain('Rencana belajar');
    expect(result.summary).not.toContain('[MOCK]');
    expect(result.summary).not.toContain('LLM_PROVIDER');

    for (const task of result.tasks) {
      expect(task.title).toBeTruthy();
      expect(task.description).toBeTruthy();
      expect(task.duration_estimate).toBeGreaterThanOrEqual(25);
      expect(task.duration_estimate).toBeLessThanOrEqual(90);
      expect(task.planned_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['morning', 'afternoon', 'evening']).toContain(task.planned_slot);
      expect(task.rationale).toBeTruthy();
      expect(task.rationale).not.toContain('[MOCK]');
    }
  });

  test('produces deterministic output for same goal title', () => {
    const ctx = makeContext();
    const a = generateMockSuggestion(ctx);
    const b = generateMockSuggestion(ctx);
    expect(a.tasks.map(t => t.title)).toEqual(b.tasks.map(t => t.title));
  });

  test('different goal titles produce different tasks', () => {
    const a = generateMockSuggestion(makeContext({ profile: { goal: 'Learn Python', deadline: null, preferred_slots: ['morning'], weekly_available_hours: 5 } }));
    const b = generateMockSuggestion(makeContext({ profile: { goal: 'Learn Rust', deadline: null, preferred_slots: ['morning'], weekly_available_hours: 5 } }));
    expect(a.tasks[0].title).not.toBe(b.tasks[0].title);
  });

  test('respects weekly_available_hours for task count', () => {
    const low = generateMockSuggestion(makeContext({ profile: { goal: 'Test', weekly_available_hours: 2, preferred_slots: ['morning'], deadline: null } }));
    const high = generateMockSuggestion(makeContext({ profile: { goal: 'Test', weekly_available_hours: 10, preferred_slots: ['morning'], deadline: null } }));
    expect(high.tasks.length).toBeGreaterThanOrEqual(low.tasks.length);
  });

  test('works with missing profile', () => {
    const result = generateMockSuggestion({});
    expect(result.tasks.length).toBeGreaterThanOrEqual(2);
    expect(result.summary).toBeTruthy();
  });

  test('dates fall between today and deadline', () => {
    const result = generateMockSuggestion(makeContext({ profile: { goal: 'Test', deadline: '2026-06-01', preferred_slots: ['morning'], weekly_available_hours: 5 } }));
    const today = new Date().toISOString().slice(0, 10);
    for (const task of result.tasks) {
      expect(task.planned_date >= today).toBe(true);
      expect(task.planned_date <= '2026-06-01').toBe(true);
    }
  });
});

describe('generateMockChat', () => {
  test('answers learning recommendation questions with contextual advice', () => {
    const result = generateMockChat({
      profile: {
        goal: 'menguasai React JS',
        current_level: 'intermediate',
        weekly_available_hours: 5,
      },
      metrics: {
        completion_rate_7d: 0.4,
      },
      remainingTasksSummary: 'Practice React components (practice, 45m), Review hooks (review, 30m)',
      payload: {
        message: 'apa rekomendasi belajar kamu?',
      },
    });

    expect(result.message).toContain('Rekomendasi saya');
    expect(result.message).toContain('menguasai React JS');
    expect(result.message).toContain('Practice React components');
    expect(result.message).not.toContain('Terima kasih sudah berbagi');
  });
});
