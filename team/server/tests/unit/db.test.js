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
    const mockTypes = {
      setTypeParser: jest.fn(),
    };

    jest.doMock('pg', () => ({
      Pool: jest.fn(() => mockPool),
      types: mockTypes,
    }));

    jest.doMock('../../src/utils/logger', () => mockLogger);
    jest.doMock('../../src/utils/retry', () => ({
      withRetry: jest.fn(async (fn) => fn()),
      isTransientPgError: jest.fn(() => false),
    }));

    const db = require('../../src/db');
    return { db, mockPool, mockLogger, mockTypes };
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

  test('registers the DATE string parser (OID 1082) once', async () => {
    const { mockTypes } = loadDbWithMocks();

    expect(mockTypes.setTypeParser).toHaveBeenCalledTimes(1);
    const [oid, parse] = mockTypes.setTypeParser.mock.calls[0];
    expect(oid).toBe(1082);
    expect(parse('2026-09-24')).toBe('2026-09-24');
  });
});
