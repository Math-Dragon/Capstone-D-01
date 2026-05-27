const { validateAIOutput, sanitizeContext } = require('../../src/services/llm');
const { LLMTaskSchema: TaskSchema } = require('../../src/models/task.model');

describe('validateAIOutput', () => {
  test('throws on invalid JSON', () => {
    expect(() => validateAIOutput('not json')).toThrow('not valid JSON');
  });

  test('throws on valid JSON with wrong schema', () => {
    const input = JSON.stringify({ wrong: 'shape' });
    expect(() => validateAIOutput(input)).toThrow('schema violation');
  });

  test('adds parsed output preview when schema validation fails', () => {
    try {
      validateAIOutput(JSON.stringify({ wrong: 'shape' }));
      throw new Error('Expected validation to fail');
    } catch (err) {
      expect(err._meta.parsed_output_preview).toContain('"wrong":"shape"');
    }
  });

  test('throws on empty tasks array', () => {
    const input = JSON.stringify({ tasks: [], summary: 'test' });
    expect(() => validateAIOutput(input)).toThrow('schema violation');
  });

  test('throws on task with missing fields', () => {
    const input = JSON.stringify({
      tasks: [{ title: 'Test' }],
      summary: 'test',
    });
    expect(() => validateAIOutput(input)).toThrow('schema violation');
  });

  test('returns parsed data on valid input', () => {
    const valid = {
      tasks: [{
        title: 'Study X',
        description: 'Read chapter 1',
        duration_estimate: 45,
        planned_date: '2026-05-01',
        planned_slot: 'morning',
        rationale: 'Best time for focus',
      }],
      summary: 'A plan',
    };
    const result = validateAIOutput(JSON.stringify(valid));
    expect(result.tasks).toHaveLength(1);
    expect(result.summary).toBe('A plan');
  });

  test('returns parsed data when provider returns an object', () => {
    const valid = {
      tasks: [{
        title: 'Study object response',
        description: 'Handle structured Gemini response',
        duration_estimate: 45,
        planned_date: '2026-05-01',
        planned_slot: 'morning',
        rationale: 'Gemini can return structured JSON directly',
      }],
      summary: 'Object plan',
    };
    const result = validateAIOutput(valid);
    expect(result.tasks).toHaveLength(1);
    expect(result.summary).toBe('Object plan');
  });

  test('unwraps chat-style plan object for plan validation', () => {
    const input = {
      message: 'Here is your plan.',
      plan: {
        tasks: [{
          title: 'Study wrapped plan',
          description: 'Handle a plan nested under a chat wrapper',
          duration_estimate: 45,
          planned_date: '2026-05-01',
          planned_slot: 'morning',
          rationale: 'Some providers return a chat envelope even for plan requests',
        }],
        summary: 'Wrapped plan',
      },
    };
    const result = validateAIOutput(input);
    expect(result.tasks).toHaveLength(1);
    expect(result.summary).toBe('Wrapped plan');
  });

  test('throws when summary is blank', () => {
    const input = JSON.stringify({
      tasks: [{
        title: 'Study blank summary',
        description: 'Summary must explain the plan.',
        duration_estimate: 45,
        planned_date: '2026-05-01',
        planned_slot: 'morning',
        rationale: 'This task has a valid rationale.',
      }],
      summary: '   ',
    });
    expect(() => validateAIOutput(input)).toThrow('schema violation');
  });
});

describe('TaskSchema', () => {
  test('rejects non-integer duration_estimate', () => {
    const result = TaskSchema.safeParse({
      title: 'Test',
      description: 'desc',
      duration_estimate: 25.5,
      planned_date: '2026-05-01',
      planned_slot: 'morning',
      rationale: 'reason',
    });
    expect(result.success).toBe(false);
  });

  test('rejects duration below 10', () => {
    const result = TaskSchema.safeParse({
      title: 'Test',
      description: 'desc',
      duration_estimate: 5,
      planned_date: '2026-05-01',
      planned_slot: 'morning',
      rationale: 'reason',
    });
    expect(result.success).toBe(false);
  });

  test('rejects invalid planned_slot', () => {
    const result = TaskSchema.safeParse({
      title: 'Test',
      description: 'desc',
      duration_estimate: 30,
      planned_date: '2026-05-01',
      planned_slot: 'midnight',
      rationale: 'reason',
    });
    expect(result.success).toBe(false);
  });

  test('rejects blank rationale', () => {
    const result = TaskSchema.safeParse({
      title: 'Test',
      description: 'desc',
      duration_estimate: 30,
      planned_date: '2026-05-01',
      planned_slot: 'morning',
      rationale: '   ',
    });
    expect(result.success).toBe(false);
  });

  test('rejects impossible planned_date', () => {
    const result = TaskSchema.safeParse({
      title: 'Test',
      description: 'desc',
      duration_estimate: 30,
      planned_date: '2026-99-99',
      planned_slot: 'morning',
      rationale: 'reason',
    });
    expect(result.success).toBe(false);
  });
});

describe('sanitizeContext', () => {
  test('removes PII fields from top level', () => {
    const input = { email: 'test@test.com', password_hash: 'hash123', google_id: 'g123', github_id: 'gh456', name: 'user', profile: { goal: 'Learn JS' } };
    const result = sanitizeContext(input);
    expect(result.email).toBeUndefined();
    expect(result.password_hash).toBeUndefined();
    expect(result.google_id).toBeUndefined();
    expect(result.github_id).toBeUndefined();
    expect(result.name).toBeUndefined();
    expect(result.profile).toEqual({ goal: 'Learn JS' });
  });

  test('preserves non-PII fields', () => {
    const input = { profile: { goal: 'Learn React' }, metrics: { streak: 5 }, remainingTasksJson: '[task]', sessionType: 'initial_plan' };
    const result = sanitizeContext(input);
    expect(result.profile).toEqual({ goal: 'Learn React' });
    expect(result.metrics).toEqual({ streak: 5 });
    expect(result.remainingTasksJson).toBe('[task]');
    expect(result.sessionType).toBe('initial_plan');
  });

  test('removes PII fields from nested objects', () => {
    const input = { user: { id: 'u1', email: 'user@test.com', password_hash: 'hash' }, profile: { user: { email: 'nested@test.com' } } };
    const result = sanitizeContext(input);
    expect(result.user.email).toBeUndefined();
    expect(result.user.password_hash).toBeUndefined();
    expect(result.user.id).toBe('u1');
    expect(result.profile.user.email).toBeUndefined();
  });

  test('handles arrays recursively', () => {
    const input = [{ email: 'a@b.com', name: 'UserA' }, { email: 'c@d.com', name: 'UserB', score: 10 }];
    const result = sanitizeContext(input);
    expect(result[0].email).toBeUndefined();
    expect(result[0].name).toBeUndefined();
    expect(result[1].email).toBeUndefined();
    expect(result[1].name).toBeUndefined();
    expect(result[1].score).toBe(10);
  });

  test('returns primitive values as-is', () => {
    expect(sanitizeContext(null)).toBeNull();
    expect(sanitizeContext(undefined)).toBeUndefined();
    expect(sanitizeContext('string')).toBe('string');
    expect(sanitizeContext(42)).toBe(42);
  });

  test('returns empty object for empty input', () => {
    expect(sanitizeContext({})).toEqual({});
  });
});
