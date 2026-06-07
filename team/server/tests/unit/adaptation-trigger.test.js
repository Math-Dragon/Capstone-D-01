const { evaluate, recordCooldown } = require('../../src/services/adaptation-trigger.service');

describe('adaptation-trigger.service', () => {
  describe('evaluate', () => {
    test('returns null for null metrics', () => {
      expect(evaluate(null)).toBeNull();
    });

    test('returns null when no triggers match', () => {
      expect(evaluate({
        completion_rate_3d: 0.8,
        avg_difficulty_7d: 3,
        completion_rate_7d: 0.8,
        streak_days: 2,
        consecutive_skips: 0,
        last_mood: 'motivated',
        trigger_cooldowns: {},
      })).toBeNull();
    });

    test('fires AT-1 for low 3d completion rate', () => {
      const result = evaluate({
        completion_rate_3d: 0.3,
        avg_difficulty_7d: 3,
        completion_rate_7d: 0.5,
        streak_days: 0,
        consecutive_skips: 0,
        last_mood: 'ok',
        trigger_cooldowns: {},
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('AT-1');
    });

    test('fires AT-5 for consecutive skips >= 3', () => {
      const result = evaluate({
        completion_rate_3d: 0.8,
        avg_difficulty_7d: 3,
        completion_rate_7d: 0.5,
        streak_days: 0,
        consecutive_skips: 3,
        last_mood: 'ok',
        trigger_cooldowns: {},
      });
      expect(result.id).toBe('AT-5');
    });

    test('high priority wins over low priority', () => {
      const result = evaluate({
        completion_rate_3d: 0.3,
        avg_difficulty_7d: 0,
        completion_rate_7d: 0.95,
        streak_days: 6,
        consecutive_skips: 4,
        last_mood: 'ok',
        trigger_cooldowns: {},
      });
      expect(result.priority).toBe('high');
    });

    test('skips trigger if within cooldown', () => {
      const recent = new Date(Date.now() - 1000 * 60 * 60).toISOString();
      const result = evaluate({
        completion_rate_3d: 0.3,
        avg_difficulty_7d: 3,
        completion_rate_7d: 0.5,
        streak_days: 0,
        consecutive_skips: 0,
        last_mood: 'ok',
        trigger_cooldowns: { 'AT-1': recent },
      });
      expect(result).toBeNull();
    });
  });

  describe('recordCooldown', () => {
    test('records trigger with timestamp', () => {
      const result = recordCooldown({}, 'AT-1');
      expect(result['AT-1']).toBeDefined();
      expect(typeof result['AT-1']).toBe('string');
    });

    test('preserves existing cooldowns', () => {
      const existing = { 'AT-2': '2026-01-01T00:00:00.000Z' };
      const result = recordCooldown(existing, 'AT-1');
      expect(result['AT-2']).toBe('2026-01-01T00:00:00.000Z');
      expect(result['AT-1']).toBeDefined();
    });

    test('handles null cooldowns', () => {
      const result = recordCooldown(null, 'AT-1');
      expect(result['AT-1']).toBeDefined();
    });
  });
});
