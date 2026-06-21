const { generateMockSuggestion, generateMockTaskAction, generateMockChat } = require('../../src/services/llm-mock');

function makeContext(overrides = {}) {
  return {
    user_id: 'u1',
    goal_id: 'g1',
    profile: { goal: 'Learn React', deadline: '2026-07-01', preferred_slots: ['morning'], weekly_available_hours: 5 },
    ...overrides,
  };
}

describe('generateMockSuggestion — additional traits', () => {
  test('works with weekly_target_hours profile key', () => {
    const ctx = makeContext({ profile: { goal: 'Learn Vue', weekly_target_hours: 10, preferred_slots: ['afternoon'], deadline: null } });
    const result = generateMockSuggestion(ctx);
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  test('works with availability array', () => {
    const ctx = makeContext({ profile: { goal: 'Learn TS', preferred_slots: ['evening'], weekly_available_hours: 3, deadline: null }, availability: ['mon', 'wed', 'fri'] });
    const result = generateMockSuggestion(ctx);
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  test('handles deadline edge case — far future', () => {
    const ctx = makeContext({ profile: { goal: 'Learn Go', deadline: '2027-12-31', preferred_slots: ['morning'], weekly_available_hours: 5 } });
    const result = generateMockSuggestion(ctx);
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  test('handles deadline edge case — null', () => {
    const ctx = makeContext({ profile: { goal: 'Learn CSS', deadline: null, preferred_slots: ['morning'], weekly_available_hours: 5 } });
    const result = generateMockSuggestion(ctx);
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  test('preferred_time context is used for slot assignment', () => {
    const morning = generateMockSuggestion(makeContext({ profile: { goal: 'Test', preferred_slots: ['morning'], weekly_available_hours: 5, deadline: null } }));
    const afternoon = generateMockSuggestion(makeContext({ profile: { goal: 'Test', preferred_slots: ['afternoon'], weekly_available_hours: 5, deadline: null } }));
    expect(morning.tasks[0].planned_slot).toBe('morning');
    expect(afternoon.tasks[0].planned_slot).toBe('afternoon');
  });
});

describe('generateMockTaskAction', () => {
  test('returns complete task message for COMPLETE_TASK', () => {
    const result = generateMockTaskAction({ payload: { action: 'COMPLETE_TASK', taskTitle: 'Learn Jest', total_completed: 3 }, metrics: { streak_days: 7 } });
    expect(result.message).toContain('Learn Jest');
    expect(result.plan).toBeNull();
  });

  test('returns short streak message for streak < 3', () => {
    const result = generateMockTaskAction({ payload: { action: 'COMPLETE_TASK', taskTitle: 'Task A', total_completed: 1 }, metrics: { streak_days: 1 } });
    expect(result.message).toContain('selesai');
  });

  test('returns medium streak message for streak >= 3', () => {
    const result = generateMockTaskAction({ payload: { action: 'COMPLETE_TASK', taskTitle: 'Task B', total_completed: 5 }, metrics: { streak_days: 3 } });
    expect(result.message).toContain('Pertahankan momentum');
  });

  test('returns skip message when reason provided', () => {
    const result = generateMockTaskAction({ payload: { reason: 'too_hard', taskTitle: 'Hard Task' } });
    expect(result.message).toContain('terlalu sulit');
  });

  test('returns feedback message when difficulty provided', () => {
    const result = generateMockTaskAction({ payload: { difficulty: 4, focus: 3, taskTitle: 'Feedback Task' } });
    expect(result.message).toContain('cukup menantang');
  });

  test('returns easy adjustment for low difficulty', () => {
    const result = generateMockTaskAction({ payload: { difficulty: 2, focus: 4, taskTitle: 'Easy Task' } });
    expect(result.message).toContain('cukup mudah');
  });

  test('returns default adjustment for mid difficulty', () => {
    const result = generateMockTaskAction({ payload: { difficulty: 3, focus: 3, taskTitle: 'Mid Task' } });
    expect(result.message).toContain('Pertahankan momentum belajarmu');
  });

  test('returns fallback for unknown action', () => {
    const result = generateMockTaskAction({ payload: {} });
    expect(result.message).toBe('Tindakan dicatat.');
  });

  test('includes notes in feedback message', () => {
    const result = generateMockTaskAction({ payload: { difficulty: 4, focus: 5, notes: 'Great session', taskTitle: 'Notes Task' } });
    expect(result.message).toContain('Great session');
  });
});

describe('generateMockChat — additional scenarios', () => {
  test('handles payload with reason (skip)', () => {
    const result = generateMockChat({ payload: { reason: 'no_time', taskTitle: 'Skipped Task' } });
    expect(result.message).toContain('tidak ada waktu');
  });

  test('handles payload with reason and note', () => {
    const result = generateMockChat({ payload: { reason: 'too_hard', note: 'Very complex', taskTitle: 'Hard Task' } });
    expect(result.message).toContain('Catatanmu');
  });

  test('handles payload with difficulty (feedback)', () => {
    const result = generateMockChat({ payload: { difficulty: 5, focus: 2, taskTitle: 'Difficult' } });
    expect(result.message).toContain('cukup menantang');
  });

  test('handles low difficulty feedback', () => {
    const result = generateMockChat({ payload: { difficulty: 1, focus: 5, taskTitle: 'Easy' } });
    expect(result.message).toContain('cukup mudah');
  });

  test('handles mid difficulty feedback', () => {
    const result = generateMockChat({ payload: { difficulty: 3, focus: 3, taskTitle: 'Mid' } });
    expect(result.message).toContain('Tingkat kesulitannya pas');
  });

  test('responds to struggle keywords', () => {
    const result = generateMockChat({ payload: { message: 'this is so hard' } });
    expect(result.message).toContain('terasa sulit');
  });

  test('responds to challenge keywords', () => {
    const result = generateMockChat({ payload: { message: 'give me more challenge' } });
    expect(result.message).toContain('tingkatkan tingkat kesulitan');
  });

  test('responds with default message for unrecognized input', () => {
    const result = generateMockChat({ payload: { message: 'hello there' } });
    expect(result.message).toContain('Terima kasih sudah berbagi');
  });

  test('handles recommendation query with completion rate', () => {
    const result = generateMockChat({
      profile: { goal: 'Learn Python', current_level: 'beginner', weekly_available_hours: 5 },
      metrics: { completion_rate_7d: 0.6 },
      remainingTasksSummary: 'Task 1 (30m)',
      payload: { message: 'apa saran kamu?' },
    });
    expect(result.message).toContain('Rekomendasi saya');
  });

  test('handles recommendation query without remaining tasks', () => {
    const result = generateMockChat({
      profile: { goal: 'Learn Python', current_level: 'advanced', weekly_available_hours: 5 },
      metrics: { completion_rate_7d: 0 },
      remainingTasksSummary: 'No tasks.',
      payload: { message: 'next' },
    });
    expect(result.message).toContain('proyek kecil');
  });

  test('handles intermediate level recommendation', () => {
    const result = generateMockChat({
      profile: { goal: 'Learn Java', current_level: 'intermediate', weekly_available_hours: 5 },
      metrics: {},
      payload: { message: 'belajar apa' },
    });
    expect(result.message).toContain('praktik terarah');
  });
});
