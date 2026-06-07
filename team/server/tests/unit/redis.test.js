const mockStore = new Map();

const mockRedisClient = {
  isOpen: false,
  on: jest.fn(),
  connect: jest.fn(async function connect() {
    mockRedisClient.isOpen = true;
  }),
  quit: jest.fn(async function quit() {
    mockRedisClient.isOpen = false;
    mockStore.clear();
  }),
  ping: jest.fn(async () => 'PONG'),
  set: jest.fn(async (key, value) => {
    mockStore.set(key, { value, ttl: null });
  }),
  setEx: jest.fn(async (key, ttl, value) => {
    mockStore.set(key, { value, ttl });
  }),
  get: jest.fn(async (key) => mockStore.get(key)?.value || null),
  del: jest.fn(async (key) => {
    mockStore.delete(key);
  }),
  ttl: jest.fn(async (key) => mockStore.get(key)?.ttl || -2),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

const { redisClient, connectRedis, closeRedis } = require('../../src/services/redis');

describe('Redis Service', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  beforeAll(async () => {
    await connectRedis();
  });

  afterAll(async () => {
    await closeRedis();
  });

  test('connects and responds to ping', async () => {
    const reply = await redisClient.ping();
    expect(reply).toBe('PONG');
  });

  test('can set and get a value', async () => {
    await redisClient.set('test-key', 'test-value');
    const value = await redisClient.get('test-key');
    expect(value).toBe('test-value');
    await redisClient.del('test-key');
  });

  test('returns null for non-existent key', async () => {
    const value = await redisClient.get('non-existent-key-' + Date.now());
    expect(value).toBeNull();
  });

  test('can set with TTL', async () => {
    await redisClient.setEx('test-ttl', 10, 'expires');
    const ttl = await redisClient.ttl('test-ttl');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(10);
    await redisClient.del('test-ttl');
  });
});
