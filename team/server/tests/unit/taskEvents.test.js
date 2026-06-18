jest.mock('../../src/repositories', () => ({
  progress: { findByUserAndWeek: jest.fn() },
}));

jest.mock('../../src/services/events', () => {
  const EventEmitter = require('events');
  const emitter = new EventEmitter();
  jest.spyOn(emitter, 'emit');
  return emitter;
});

const { emitTaskCompleted, getISOWeek, getCurrentWeek } = require('../../src/utils/taskEvents');
const repos = require('../../src/repositories');
const appEvents = require('../../src/services/events');

describe('taskEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('emitTaskCompleted', () => {
    test('emits task:completed event', async () => {
      repos.progress.findByUserAndWeek.mockResolvedValue(null);

      await emitTaskCompleted('u1', 't1');

      expect(appEvents.emit).toHaveBeenCalledWith('task:completed', { userId: 'u1', taskId: 't1' });
    });

    test('emits milestone:reached when completion_rate >= 1.0', async () => {
      repos.progress.findByUserAndWeek.mockResolvedValue({ completion_rate: '1.0' });

      await emitTaskCompleted('u1', 't1');

      expect(appEvents.emit).toHaveBeenCalledWith('milestone:reached', expect.objectContaining({
        userId: 'u1',
        milestone: expect.stringMatching(/^week_\d{4}-W\d{2}_complete$/),
      }));
    });

    test('emits milestone:reached when completion_rate > 1.0', async () => {
      repos.progress.findByUserAndWeek.mockResolvedValue({ completion_rate: '2.0' });

      await emitTaskCompleted('u1', 't1');

      expect(appEvents.emit).toHaveBeenCalledWith('milestone:reached', expect.anything());
    });

    test('does not emit milestone when completion_rate < 1.0', async () => {
      repos.progress.findByUserAndWeek.mockResolvedValue({ completion_rate: '0.75' });

      await emitTaskCompleted('u1', 't1');

      const milestoneCalls = appEvents.emit.mock.calls.filter(
        call => call[0] === 'milestone:reached'
      );
      expect(milestoneCalls.length).toBe(0);
    });

    test('does not emit milestone when progress is null', async () => {
      repos.progress.findByUserAndWeek.mockResolvedValue(null);

      await emitTaskCompleted('u1', 't1');

      const milestoneCalls = appEvents.emit.mock.calls.filter(
        call => call[0] === 'milestone:reached'
      );
      expect(milestoneCalls.length).toBe(0);
    });

    test('handles progress repo errors gracefully — still emits task:completed', async () => {
      repos.progress.findByUserAndWeek.mockRejectedValue(new Error('DB error'));

      await emitTaskCompleted('u1', 't1');

      expect(appEvents.emit).toHaveBeenCalledWith('task:completed', { userId: 'u1', taskId: 't1' });
    });

    test('does not throw when progress repo fails', async () => {
      repos.progress.findByUserAndWeek.mockRejectedValue(new Error('DB error'));

      await expect(emitTaskCompleted('u1', 't1')).resolves.toBeUndefined();
    });
  });

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
