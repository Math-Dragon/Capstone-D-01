const { validateAIOutput, validateChatOutput, validateWithWarnings } = require('../../src/services/llm');

describe('validateAIOutput — additional edge cases', () => {
  test('strips markdown code fences from string', () => {
    const input = '```json\n{"tasks":[{"title":"Test","description":"Desc","duration_estimate":30,"planned_date":"2026-06-01","planned_slot":"morning","rationale":"Reason"}],"summary":"Plan"}\n```';
    const result = validateAIOutput(input);
    expect(result.tasks).toHaveLength(1);
    expect(result.summary).toBe('Plan');
  });

  test('extracts JSON from text with surrounding content', () => {
    const input = 'Here is your plan:\n```\n{"tasks":[{"title":"Extracted","description":"Desc","duration_estimate":45,"planned_date":"2026-06-01","planned_slot":"afternoon","rationale":"Extracted from text"}],"summary":"Extracted"}\n```\nLet me know if you need changes.';
    const result = validateAIOutput(input);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe('Extracted');
  });

  test('strips empty keys from parsed object', () => {
    const input = { tasks: [{ title: 'A', description: 'Desc', duration_estimate: 30, planned_date: '2026-06-01', planned_slot: 'morning', rationale: 'R' }], summary: 'S', '': 'should be removed' };
    const result = validateAIOutput(input);
    expect(result).not.toHaveProperty('');
  });

  test('unwraps adjusted_plan to tasks', () => {
    const input = {
      adjusted_plan: [{ title: 'Adjusted', description: 'Desc', duration_estimate: 30, planned_date: '2026-06-01', planned_slot: 'morning', rationale: 'R' }],
      summary: 'Adjusted plan',
    };
    const result = validateAIOutput(input);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe('Adjusted');
  });

  test('unwraps content string that contains JSON', () => {
    const input = {
      content: '{"tasks":[{"title":"Nested","description":"Desc","duration_estimate":30,"planned_date":"2026-06-01","planned_slot":"morning","rationale":"R"}],"summary":"Nested plan"}',
    };
    const result = validateAIOutput(input);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe('Nested');
  });

  test('unwraps plan.tasks from chat-style wrapper', () => {
    const input = {
      plan: { tasks: [{ title: 'Wrapped', description: 'Desc', duration_estimate: 30, planned_date: '2026-06-01', planned_slot: 'morning', rationale: 'R' }], summary: 'Wrapped plan' },
    };
    const result = validateAIOutput(input);
    expect(result.tasks).toHaveLength(1);
    expect(result.summary).toBe('Wrapped plan');
  });

  test('throws when plan has empty tasks array (no valid tasks)', () => {
    const input = { message: 'No plan needed', plan: { tasks: [] } };
    expect(() => validateAIOutput(input)).toThrow('schema violation');
  });

  test('strips plan when it is not an object', () => {
    const input = { tasks: [{ title: 'A', description: 'Desc', duration_estimate: 30, planned_date: '2026-06-01', planned_slot: 'morning', rationale: 'R' }], summary: 'S', plan: 'not-an-object' };
    const result = validateAIOutput(input);
    expect(result.plan).toBeUndefined();
  });
});

describe('validateChatOutput', () => {
  test('validates a valid chat response', () => {
    const input = { message: 'Hello there', plan: null };
    const result = validateChatOutput(input);
    expect(result.message).toBe('Hello there');
    expect(result.plan).toBeNull();
  });

  test('throws on invalid chat response', () => {
    expect(() => validateChatOutput({})).toThrow('schema violation');
  });

  test('throws on invalid JSON string', () => {
    expect(() => validateChatOutput('not json')).toThrow('not valid JSON');
  });
});

describe('validateWithWarnings', () => {
  test('returns data with empty violations on valid input', () => {
    const input = {
      tasks: [{ title: 'A', description: 'Desc', duration_estimate: 30, planned_date: '2026-06-01', planned_slot: 'morning', rationale: 'R' }],
      summary: 'S',
    };
    const result = validateWithWarnings(input);
    expect(result.data.summary).toBe('S');
    expect(result.violations).toEqual([]);
  });

  test('returns recoverable violations for duration_estimate too_big', () => {
    const input = {
      tasks: [{ title: 'A', description: 'Desc', duration_estimate: 999, planned_date: '2026-06-01', planned_slot: 'morning', rationale: 'R' }],
      summary: 'S',
    };
    const result = validateWithWarnings(input);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0].path).toContain('duration_estimate');
  });

  test('returns recoverable violations for duration_estimate too_small', () => {
    const input = {
      tasks: [{ title: 'A', description: 'Desc', duration_estimate: 5, planned_date: '2026-06-01', planned_slot: 'morning', rationale: 'R' }],
      summary: 'S',
    };
    const result = validateWithWarnings(input);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  test('throws on unrecoverable violations', () => {
    const input = { tasks: [], summary: 'S' };
    expect(() => validateWithWarnings(input)).toThrow('schema violation');
  });
});
