const { getISOWeek, getCurrentWeek } = require('../../src/utils/week');

describe('week utilities', () => {
  describe('getISOWeek', () => {
    test('returns correct ISO week for known date', () => {
      expect(getISOWeek('2026-01-05')).toBe('2026-W02');
    });

    test('returns correct format YYYY-Www', () => {
      expect(getISOWeek('2026-06-15')).toMatch(/^\d{4}-W\d{2}$/);
    });
  });

  describe('getCurrentWeek', () => {
    test('returns a non-empty week string matching format', () => {
      const week = getCurrentWeek();
      expect(week).toMatch(/^\d{4}-W\d{2}$/);
    });
  });
});
