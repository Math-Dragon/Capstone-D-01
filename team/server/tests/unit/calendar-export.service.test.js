process.env.SKIP_DB_CHECK = 'true';

const service = require('../../src/services/calendar-export.service');

describe('calendar-export.service', () => {
  test('buildCalendar produces a VCALENDAR with VEVENT entries', () => {
    const text = service.buildCalendar('user-1', [{
      id: 'task-1',
      title: 'Review React hooks',
      description: 'Read docs',
      goal_title: 'React Goal',
      planned_date: '2026-06-20',
      planned_slot: 'morning',
      duration_estimate: 50,
      rationale: 'Focus on core patterns',
    }]);

    expect(text).toContain('BEGIN:VCALENDAR');
    expect(text).toContain('BEGIN:VEVENT');
    expect(text).toContain('SUMMARY:Review React hooks');
    expect(text).toContain('DESCRIPTION:Description: Read docs\\nGoal: React Goal\\nRationale: Focus on core patterns');
    expect(text).toContain('UID:task-1-user-1@stepup');
  });

  test('handles planned_date as Date object from PostgreSQL', () => {
    const text = service.buildCalendar('user-1', [{
      id: 'task-2',
      title: 'Date from DB',
      planned_date: new Date('2026-06-20'),
      planned_slot: 'afternoon',
      duration_estimate: 60,
    }]);

    expect(text).toContain('DTSTART:20260620T130000');
    expect(text).toContain('DTEND:20260620T140000');
    expect(text).toContain('SUMMARY:Date from DB');
  });
});
