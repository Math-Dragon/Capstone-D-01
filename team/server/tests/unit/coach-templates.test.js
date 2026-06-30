process.env.SKIP_DB_CHECK = 'true';

const { TEMPLATES } = require('../../src/services/coach/templates');

const baseProfile = {
  goal: 'Learn JS',
  subjects: 'JavaScript',
  current_level: 'beginner',
  weekly_available_hours: 10,
  preferred_slots: 'morning',
  available_days: ['mon', 'wed', 'fri'],
  deadline: '2026-06-01',
};

const baseMetrics = {
  streak_days: 3,
  completion_rate_7d: 0.7,
  consecutive_skips: 0,
  last_mood: 'good',
  total_completed: 15,
};

describe('TEMPLATES.initial_plan', () => {
  test('generates prompt with profile data', () => {
    const result = TEMPLATES.initial_plan({ profile: baseProfile });
    expect(result).toContain('[session_type: initial_plan]');
    expect(result).toContain('Learn JS');
    expect(result).toContain('mon, wed, fri');
    expect(result).toContain('2026-06-01');
  });

  test('uses default available days when not provided', () => {
    const profile = { ...baseProfile, available_days: undefined };
    const result = TEMPLATES.initial_plan({ profile });
    expect(result).toContain('mon, tue, wed, thu, fri');
  });

  test('uses open-ended when no deadline', () => {
    const profile = { ...baseProfile, deadline: undefined };
    const result = TEMPLATES.initial_plan({ profile });
    expect(result).toContain('open-ended');
  });

  test('uses compact prompt when compact mode is enabled', () => {
    const result = TEMPLATES.initial_plan({ profile: baseProfile, compactMode: true });
    expect(result).toContain('Limit tasks to 3-5');
    expect(result).toContain('short rationale explanations under 18 words');
  });
});

describe('TEMPLATES.task_action', () => {
  const baseCtx = {
    payload: {},
    remainingTasksJson: '[]',
    metrics: baseMetrics,
    profile: baseProfile,
  };

  test('COMPLETE_TASK branch', () => {
    const ctx = { ...baseCtx, payload: { action: 'COMPLETE_TASK', taskTitle: 'Task 1' } };
    const result = TEMPLATES.task_action(ctx);
    expect(result).toContain('[session_type: task_action]');
    expect(result).toContain('Student completed task "Task 1"');
  });

  test('COMPLETE_TASK with unknown title', () => {
    const ctx = { ...baseCtx, payload: { action: 'COMPLETE_TASK' } };
    const result = TEMPLATES.task_action(ctx);
    expect(result).toContain('unknown');
  });

  test('skip with reason branch', () => {
    const ctx = { ...baseCtx, payload: { reason: 'too_hard', taskTitle: 'Task 2' } };
    const result = TEMPLATES.task_action(ctx);
    expect(result).toContain('skipped task "Task 2"');
    expect(result).toContain('too_hard');
  });

  test('skip with note', () => {
    const ctx = { ...baseCtx, payload: { reason: 'busy', taskTitle: 'T', note: 'meetings' } };
    const result = TEMPLATES.task_action(ctx);
    expect(result).toContain('Note: meetings');
  });

  test('feedback branch', () => {
    const ctx = { ...baseCtx, payload: { difficulty: 4, focus: 3, taskTitle: 'Task 3' } };
    const result = TEMPLATES.task_action(ctx);
    expect(result).toContain('feedback on task "Task 3"');
    expect(result).toContain('4/5');
  });

  test('feedback with notes', () => {
    const ctx = { ...baseCtx, payload: { difficulty: 3, focus: 4, taskTitle: 'T', notes: 'great' } };
    const result = TEMPLATES.task_action(ctx);
    expect(result).toContain('Notes: great');
  });

  test('uses default available days', () => {
    const ctx = { ...baseCtx, payload: { action: 'COMPLETE_TASK' }, profile: { ...baseProfile, available_days: undefined } };
    const result = TEMPLATES.task_action(ctx);
    expect(result).toContain('mon, tue, wed, thu, fri');
  });
});

describe('TEMPLATES.check_in', () => {
  test('generates check-in prompt', () => {
    const result = TEMPLATES.check_in({
      payload: { mood: 'great' },
      metrics: baseMetrics,
      completedSummary: 'Task 1, Task 2',
      skippedSummary: 'None',
      remainingTasksJson: '[]',
    });
    expect(result).toContain('[session_type: check_in]');
    expect(result).toContain('great');
    expect(result).toContain('Task 1, Task 2');
  });
});

describe('TEMPLATES.adjustment', () => {
  test('generates adjustment prompt', () => {
    const result = TEMPLATES.adjustment({
      payload: { type: 'reschedule', message: 'Need to move tasks' },
      metrics: baseMetrics,
      remainingTasksJson: '[]',
      profile: baseProfile,
    });
    expect(result).toContain('[session_type: adjustment]');
    expect(result).toContain('reschedule');
    expect(result).toContain('Need to move tasks');
  });

  test('uses defaults for missing payload fields', () => {
    const result = TEMPLATES.adjustment({
      payload: {},
      metrics: baseMetrics,
      remainingTasksJson: '[]',
      profile: baseProfile,
    });
    expect(result).toContain('custom');
  });
});

describe('TEMPLATES.chat', () => {
  const baseCtx = {
    payload: {},
    metrics: baseMetrics,
    chatHistory: 'User: Hi',
    remainingTasksSummary: '3 tasks left',
    profile: baseProfile,
  };

  test('skip with reason branch', () => {
    const ctx = { ...baseCtx, payload: { reason: 'tired', taskTitle: 'Task' } };
    const result = TEMPLATES.chat(ctx);
    expect(result).toContain('[session_type: chat]');
    expect(result).toContain('skipped task "Task"');
    expect(result).toContain('tired');
  });

  test('skip with note', () => {
    const ctx = { ...baseCtx, payload: { reason: 'tired', taskTitle: 'T', note: 'sleepy' } };
    const result = TEMPLATES.chat(ctx);
    expect(result).toContain('Note: sleepy');
  });

  test('feedback branch', () => {
    const ctx = { ...baseCtx, payload: { difficulty: 5, focus: 4, taskTitle: 'Task' } };
    const result = TEMPLATES.chat(ctx);
    expect(result).toContain('feedback on task "Task"');
    expect(result).toContain('5/5');
  });

  test('feedback with notes', () => {
    const ctx = { ...baseCtx, payload: { difficulty: 3, focus: 3, taskTitle: 'T', notes: 'ok' } };
    const result = TEMPLATES.chat(ctx);
    expect(result).toContain('Notes: ok');
  });

  test('message branch (default)', () => {
    const ctx = { ...baseCtx, payload: { message: 'Hello coach!' } };
    const result = TEMPLATES.chat(ctx);
    expect(result).toContain('Student message: Hello coach!');
  });

  test('message branch with empty message', () => {
    const ctx = { ...baseCtx, payload: {} };
    const result = TEMPLATES.chat(ctx);
    expect(result).toContain('Student message:');
  });
});

describe('TEMPLATES.crisis', () => {
  test('generates crisis prompt', () => {
    const result = TEMPLATES.crisis({
      metrics: { ...baseMetrics, last_mood: 'drained', consecutive_skips: 5, completion_rate_3d: 0.2 },
      remainingTasksJson: '[]',
      profile: baseProfile,
    });
    expect(result).toContain('[session_type: crisis]');
    expect(result).toContain('drained');
  });
});

describe('TEMPLATES.milestone', () => {
  test('generates milestone prompt', () => {
    const result = TEMPLATES.milestone({
      metrics: { ...baseMetrics, total_completed: 20 },
      profile: baseProfile,
    });
    expect(result).toContain('[session_type: milestone]');
    expect(result).toContain('20 tasks');
  });
});
