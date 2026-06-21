process.env.SKIP_DB_CHECK = 'true';

jest.mock('../../src/middleware/rateLimiter', () => ({
  authLimiter: (_req, _res, next) => next(),
  aiLimiter: (_req, _res, next) => next(),
  generalLimiter: (_req, _res, next) => next(),
}));

jest.mock('../../src/repositories', () => ({
  task: {
    findScheduledByUser: jest.fn(),
  },
}));

jest.mock('../../src/services/calendar-export.service', () => ({
  buildCalendar: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const request = require('supertest');
const repos = require('../../src/repositories');
const calendarExportService = require('../../src/services/calendar-export.service');
const config = require('../../src/config');
const app = require('../../src/app');

describe('calendar export route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/calendar/export.ics returns a calendar attachment', async () => {
    repos.task.findScheduledByUser.mockResolvedValue([
      { id: 'task-1', title: 'Review React hooks', planned_date: '2026-06-20' },
    ]);
    calendarExportService.buildCalendar.mockReturnValue('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n');

    const token = jwt.sign({ id: 'user-1', email: 'user@example.com' }, config.jwtSecret);
    const res = await request(app)
      .get('/api/calendar/export.ics')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/calendar');
    expect(res.headers['content-disposition']).toContain('attachment; filename="stepup-calendar.ics"');
    expect(repos.task.findScheduledByUser).toHaveBeenCalledWith('user-1');
    expect(calendarExportService.buildCalendar).toHaveBeenCalledWith('user-1', [
      { id: 'task-1', title: 'Review React hooks', planned_date: '2026-06-20' },
    ]);
  });
});
