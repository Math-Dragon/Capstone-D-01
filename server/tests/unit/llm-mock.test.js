const { generateMockSuggestion } = require('../../src/services/llm-mock');

function makeContext(overrides = {}) {
  return {
    user_id: 'mock-user-id',
    goal_id: 'mock-goal-id',
    timezone: 'Asia/Jakarta',
    preferred_time: 'morning',
    weekly_target_hours: 5.0,
    availability: {},
    goal: {
      title: 'Learn React Fundamentals',
      description: 'Master hooks and state management',
      deadline: '2026-06-30',
      existing_tasks: [],
    },
    extra_context: {},
    ...overrides,
  };
}

describe('generateMockSuggestion', () => {
  test('returns valid schema-conforming output', () => {
    const result = generateMockSuggestion(makeContext());
    expect(result.tasks.length).toBeGreaterThanOrEqual(2);
    expect(result.tasks.length).toBeLessThanOrEqual(5);
    expect(result.summary).toContain('[MOCK]');

    for (const task of result.tasks) {
      expect(task.title).toBeTruthy();
      expect(task.description).toBeTruthy();
      expect(task.duration_estimate).toBeGreaterThanOrEqual(25);
      expect(task.duration_estimate).toBeLessThanOrEqual(90);
      expect(task.planned_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['morning', 'afternoon', 'evening']).toContain(task.planned_slot);
      expect(task.rationale).toBeTruthy();
    }
  });

  test('produces deterministic output for same goal title', () => {
    const ctx = makeContext();
    const a = generateMockSuggestion(ctx);
    const b = generateMockSuggestion(ctx);
    expect(a.tasks.map(t => t.title)).toEqual(b.tasks.map(t => t.title));
  });

  test('different goal titles produce different tasks', () => {
    const a = generateMockSuggestion(makeContext({ goal: { title: 'Learn Python', description: '', deadline: null, existing_tasks: [] } }));
    const b = generateMockSuggestion(makeContext({ goal: { title: 'Learn Rust', description: '', deadline: null, existing_tasks: [] } }));
    expect(a.tasks[0].title).not.toBe(b.tasks[0].title);
  });

  test('respects weekly_target_hours for task count', () => {
    const low = generateMockSuggestion(makeContext({ weekly_target_hours: 2 }));
    const high = generateMockSuggestion(makeContext({ weekly_target_hours: 10 }));
    expect(high.tasks.length).toBeGreaterThanOrEqual(low.tasks.length);
  });

  test('works with missing goal fields', () => {
    const result = generateMockSuggestion({ goal: {} });
    expect(result.tasks.length).toBeGreaterThanOrEqual(2);
    expect(result.summary).toBeTruthy();
  });

  test('dates fall between today and deadline', () => {
    const result = generateMockSuggestion(makeContext({ goal: { title: 'Test', description: '', deadline: '2026-06-01', existing_tasks: [] } }));
    const today = new Date().toISOString().slice(0, 10);
    for (const task of result.tasks) {
      expect(task.planned_date >= today).toBe(true);
      expect(task.planned_date <= '2026-06-01').toBe(true);
    }
  });
});
