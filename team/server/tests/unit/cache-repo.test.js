jest.mock('../../src/utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const mockRedisClient = {
  isOpen: false,
  on: jest.fn(),
  connect: jest.fn(async function connect() { mockRedisClient.isOpen = true; }),
  quit: jest.fn(async function quit() { mockRedisClient.isOpen = false; }),
  ping: jest.fn(async () => 'PONG'),
  set: jest.fn(async () => 'OK'),
  get: jest.fn(),
  del: jest.fn(async () => 1),
  incr: jest.fn(async () => 1),
  exists: jest.fn(),
};

jest.mock('../../src/services/redis', () => ({
  redisClient: mockRedisClient,
}));

const cacheRepo = require('../../src/repositories/cache.repo');
const logger = require('../../src/utils/logger');

beforeEach(() => {
  jest.clearAllMocks();
  mockRedisClient.isOpen = false;
  mockRedisClient.get.mockReset();
  mockRedisClient.exists.mockReset();
  mockRedisClient.get.mockResolvedValue(null);
  mockRedisClient.exists.mockResolvedValue(0);
});

describe('CacheRepository.set', () => {
  test('stores a string value', async () => {
    const result = await cacheRepo.set('key1', 'string-value', 100);
    expect(result).toBe(true);
    expect(mockRedisClient.set).toHaveBeenCalledWith('key1', 'string-value', { EX: 100 });
  });

  test('serializes object values to JSON', async () => {
    const obj = { a: 1, b: [2, 3] };
    await cacheRepo.set('obj-key', obj, 3600);
    expect(mockRedisClient.set).toHaveBeenCalledWith('obj-key', JSON.stringify(obj), { EX: 3600 });
  });

  test('connects if redis is not open', async () => {
    await cacheRepo.set('key', 'val');
    expect(mockRedisClient.connect).toHaveBeenCalled();
  });

  test('does not connect if redis is already open', async () => {
    mockRedisClient.isOpen = true;
    await cacheRepo.set('key', 'val');
    expect(mockRedisClient.connect).not.toHaveBeenCalled();
  });

  test('returns false on redis error', async () => {
    mockRedisClient.set.mockRejectedValue(new Error('Redis down'));
    const result = await cacheRepo.set('key', 'val');
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('CacheRepository.get', () => {
  test('returns parsed JSON for JSON value', async () => {
    mockRedisClient.get.mockResolvedValue('{"a":1}');
    const result = await cacheRepo.get('json-key');
    expect(result).toEqual({ a: 1 });
  });

  test('returns raw string for non-JSON value', async () => {
    mockRedisClient.get.mockResolvedValue('plain-string');
    const result = await cacheRepo.get('str-key');
    expect(result).toBe('plain-string');
  });

  test('returns null on cache miss', async () => {
    const result = await cacheRepo.get('missing-key');
    expect(result).toBeNull();
  });

  test('returns null on redis error', async () => {
    mockRedisClient.get.mockRejectedValue(new Error('Redis down'));
    const result = await cacheRepo.get('key');
    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('CacheRepository.del', () => {
  test('deletes existing key', async () => {
    const result = await cacheRepo.del('existing-key');
    expect(result).toBe(true);
    expect(mockRedisClient.del).toHaveBeenCalledWith('existing-key');
  });

  test('handles non-existent key', async () => {
    mockRedisClient.del.mockResolvedValue(0);
    const result = await cacheRepo.del('non-existent');
    expect(result).toBe(true);
  });

  test('returns false on redis error', async () => {
    mockRedisClient.del.mockRejectedValue(new Error('Redis down'));
    const result = await cacheRepo.del('key');
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('CacheRepository.incr', () => {
  test('increments normally', async () => {
    mockRedisClient.incr = jest.fn(async () => 5);
    const result = await cacheRepo.incr('counter');
    expect(result).toBe(5);
  });

  test('returns null on error', async () => {
    mockRedisClient.incr = jest.fn(async () => { throw new Error('Redis down'); });
    const result = await cacheRepo.incr('counter');
    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('CacheRepository.exists', () => {
  test('returns truthy when key exists', async () => {
    mockRedisClient.exists.mockResolvedValue(1);
    const result = await cacheRepo.exists('existing-key');
    expect(result).toBeTruthy();
  });

  test('returns falsy when key does not exist', async () => {
    mockRedisClient.exists.mockResolvedValue(0);
    const result = await cacheRepo.exists('missing-key');
    expect(result).toBeFalsy();
  });

  test('returns false on redis error', async () => {
    mockRedisClient.exists.mockRejectedValue(new Error('Redis down'));
    const result = await cacheRepo.exists('key');
    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalled();
  });
});
