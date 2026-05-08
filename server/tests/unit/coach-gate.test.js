jest.mock('../../src/services/adaptation-trigger.service', () => ({
  evaluate: jest.fn(),
}));

const { evaluateGate } = require('../../src/services/coach/gate.service');
const adaptationTrigger = require('../../src/services/adaptation-trigger.service');

beforeEach(() => jest.clearAllMocks());

describe('gate.service evaluateGate', () => {
  test('COMPLETE_TASK with trigger returns staticOnly false', () => {
    adaptationTrigger.evaluate.mockReturnValue({ type: 'crisis' });
    const result = evaluateGate('COMPLETE_TASK', {}, {});
    expect(result).toEqual({ staticOnly: false, triggerFired: { type: 'crisis' }, sessionTypeOverride: null });
  });

  test('COMPLETE_TASK without trigger returns staticOnly true', () => {
    adaptationTrigger.evaluate.mockReturnValue(null);
    const result = evaluateGate('COMPLETE_TASK', {}, {});
    expect(result).toEqual({ staticOnly: true, triggerFired: null, sessionTypeOverride: null });
  });

  test('SUBMIT_FEEDBACK with trigger returns staticOnly false', () => {
    adaptationTrigger.evaluate.mockReturnValue({ type: 'milestone' });
    const result = evaluateGate('SUBMIT_FEEDBACK', {}, {});
    expect(result).toEqual({ staticOnly: false, triggerFired: { type: 'milestone' }, sessionTypeOverride: null });
  });

  test('SUBMIT_FEEDBACK without trigger returns staticOnly true', () => {
    adaptationTrigger.evaluate.mockReturnValue(null);
    const result = evaluateGate('SUBMIT_FEEDBACK', {}, {});
    expect(result).toEqual({ staticOnly: true, triggerFired: null, sessionTypeOverride: null });
  });

  test('SKIP_TASK low skips non-signal reason returns staticOnly true', () => {
    const result = evaluateGate('SKIP_TASK', { consecutive_skips: 0 }, { reason: 'busy' });
    expect(result).toEqual({ staticOnly: true, triggerFired: null, sessionTypeOverride: null });
  });

  test('SKIP_TASK high consecutive skips returns staticOnly false', () => {
    const result = evaluateGate('SKIP_TASK', { consecutive_skips: 3 }, { reason: 'busy' });
    expect(result).toEqual({ staticOnly: false, triggerFired: null, sessionTypeOverride: 'adjustment' });
  });

  test('SKIP_TASK signal reason returns staticOnly false', () => {
    const result = evaluateGate('SKIP_TASK', { consecutive_skips: 0 }, { reason: 'too_hard' });
    expect(result).toEqual({ staticOnly: false, triggerFired: null, sessionTypeOverride: 'adjustment' });
  });

  test('SKIP_TASK not_interested reason returns staticOnly false', () => {
    const result = evaluateGate('SKIP_TASK', { consecutive_skips: 0 }, { reason: 'not_interested' });
    expect(result).toEqual({ staticOnly: false, triggerFired: null, sessionTypeOverride: 'adjustment' });
  });

  test('CHECK_IN good conditions returns staticOnly true', () => {
    const result = evaluateGate('CHECK_IN',
      { completion_rate_7d: 0.8, consecutive_skips: 0 },
      { mood: 'good' },
    );
    expect(result).toEqual({ staticOnly: true, triggerFired: null, sessionTypeOverride: null });
  });

  test('CHECK_IN low rate returns staticOnly false', () => {
    const result = evaluateGate('CHECK_IN',
      { completion_rate_7d: 0.5, consecutive_skips: 0 },
      { mood: 'good' },
    );
    expect(result).toEqual({ staticOnly: false, triggerFired: null, sessionTypeOverride: null });
  });

  test('CHECK_IN with skips returns staticOnly false', () => {
    const result = evaluateGate('CHECK_IN',
      { completion_rate_7d: 0.8, consecutive_skips: 2 },
      { mood: 'okay' },
    );
    expect(result).toEqual({ staticOnly: false, triggerFired: null, sessionTypeOverride: null });
  });

  test('CHECK_IN bad mood returns staticOnly false', () => {
    const result = evaluateGate('CHECK_IN',
      { completion_rate_7d: 0.8, consecutive_skips: 0 },
      { mood: 'stressed' },
    );
    expect(result).toEqual({ staticOnly: false, triggerFired: null, sessionTypeOverride: null });
  });

  test('default action returns staticOnly false', () => {
    const result = evaluateGate('UNKNOWN_ACTION', {}, {});
    expect(result).toEqual({ staticOnly: false, triggerFired: null, sessionTypeOverride: null });
  });

  test('SKIP_TASK with null metrics', () => {
    const result = evaluateGate('SKIP_TASK', null, {});
    expect(result.staticOnly).toBe(true);
  });

  test('SKIP_TASK with null payload', () => {
    const result = evaluateGate('SKIP_TASK', { consecutive_skips: 0 }, null);
    expect(result.staticOnly).toBe(true);
  });

  test('CHECK_IN with null metrics', () => {
    const result = evaluateGate('CHECK_IN', null, { mood: 'great' });
    expect(result.staticOnly).toBe(false);
  });
});
