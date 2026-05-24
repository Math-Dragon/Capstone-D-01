const { validateAIOutput } = require('../../src/services/llm');
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
});
