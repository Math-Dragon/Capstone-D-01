const { validateAIOutput, TaskSchema } = require('../../src/services/llm');

describe('validateAIOutput', () => {
  test('throws on invalid JSON', () => {
    expect(() => validateAIOutput('not json')).toThrow('not valid JSON');
  });

  test('throws on valid JSON with wrong schema', () => {
    const input = JSON.stringify({ wrong: 'shape' });
    expect(() => validateAIOutput(input)).toThrow('schema violation');
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

  test('rejects duration below 25', () => {
    const result = TaskSchema.safeParse({
      title: 'Test',
      description: 'desc',
      duration_estimate: 20,
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
