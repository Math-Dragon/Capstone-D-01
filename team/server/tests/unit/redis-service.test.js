const mockRedisClient = {
  _isOpen: false,
  get isOpen() { return this._isOpen; },
  set isOpen(v) { this._isOpen = v; },
  on: jest.fn(),
  connect: jest.fn(function() { this._isOpen = true; return Promise.resolve(); }),
  quit: jest.fn(function() { this._isOpen = false; return Promise.resolve(); }),
  ping: jest.fn(() => 'PONG'),
  set: jest.fn(),
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  exists: jest.fn(),
  ttl: jest.fn(),
};

jest.mock('redis', () => ({ createClient: jest.fn(() => mockRedisClient) }));

const { connectRedis, closeRedis } = require('../../src/services/redis');

beforeEach(() => {
  jest.clearAllMocks();
  mockRedisClient._isOpen = false;
  mockRedisClient.connect = jest.fn(function() { this._isOpen = true; return Promise.resolve(); });
  mockRedisClient.quit = jest.fn(function() { this._isOpen = false; return Promise.resolve(); });
});

describe('RedisService.connect branches', () => {
  test('connects when not already connected', async () => {
    expect(mockRedisClient.isOpen).toBe(false);
    await connectRedis();
    expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.isOpen).toBe(true);
  });

  test('returns early when already connected', async () => {
    mockRedisClient.isOpen = true;
    await connectRedis();
    expect(mockRedisClient.connect).not.toHaveBeenCalled();
  });

  test('reuses pending connection promise when _connecting is set', async () => {
    mockRedisClient.isOpen = false;
    let deferredResolve;
    mockRedisClient.connect = jest.fn(() => new Promise((resolve) => { deferredResolve = resolve; }));

    const p1 = connectRedis();
    const p2 = connectRedis();
    expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);

    mockRedisClient.isOpen = true;
    deferredResolve();
    await Promise.all([p1, p2]);
    expect(mockRedisClient.isOpen).toBe(true);
  });
});

describe('RedisService.quit branches', () => {
  test('calls quit when connected', async () => {
    mockRedisClient.isOpen = true;
    await closeRedis();
    expect(mockRedisClient.quit).toHaveBeenCalledTimes(1);
    expect(mockRedisClient.isOpen).toBe(false);
  });

  test('does nothing when not connected', async () => {
    mockRedisClient.isOpen = false;
    await closeRedis();
    expect(mockRedisClient.quit).not.toHaveBeenCalled();
  });
});
