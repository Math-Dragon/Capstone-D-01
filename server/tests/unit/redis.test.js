const { redisClient, connectRedis, closeRedis } = require('../../src/services/redis');

describe('Redis Service', () => {
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
