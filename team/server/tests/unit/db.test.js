process.env.SKIP_DB_CHECK = 'true';

describe('db.query observability', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  function loadDbWithMocks() {
    const mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      on: jest.fn(),
    };
    const mockLogger = {
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock('pg', () => ({
      Pool: jest.fn(() => mockPool),
    }));

    jest.doMock('../../src/utils/logger', () => mockLogger);
    jest.doMock('../../src/utils/retry', () => ({
      withRetry: jest.fn(async (fn) => fn()),
      isTransientPgError: jest.fn(() => false),
    }));

    const db = require('../../src/db');
    return { db, mockPool, mockLogger };
  }

  test('logs slow queries over 500ms', async () => {
    const { db, mockPool, mockLogger } = loadDbWithMocks();

    mockPool.query.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 550));
      return { rows: [], rowCount: 0 };
    });

    await db.query('SELECT pg_sleep(0.55)', []);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'db_slow_query',
      }),
      'Database query exceeded slow-query threshold'
    );
  });

  test('does not log queries at or below 500ms', async () => {
    const { db, mockPool, mockLogger } = loadDbWithMocks();

    mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 });

    await db.query('SELECT 1', []);

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});
