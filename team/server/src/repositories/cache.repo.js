const { redisClient } = require('../services/redis');
const logger = require('../utils/logger');

class CacheRepository {
  /**
   * Set a value in the cache with an optional TTL
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlSeconds 
   */
  async set(key, value, ttlSeconds = 3600) {
    try {
      if (!redisClient.isOpen) await redisClient.connect();
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      await redisClient.set(key, stringValue, {
        EX: ttlSeconds
      });
      return true;
    } catch (err) {
      logger.error({ err, key }, 'Failed to set cache');
      return false;
    }
  }

  /**
   * Get a value from the cache
   * @param {string} key 
   * @returns {Promise<any>}
   */
  async get(key) {
    try {
      if (!redisClient.isOpen) await redisClient.connect();
      const value = await redisClient.get(key);
      if (!value) return null;
      
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (err) {
      logger.error({ err, key }, 'Failed to get from cache');
      return null;
    }
  }

  /**
   * Delete a value from the cache
   * @param {string} key 
   */
  async del(key) {
    try {
      if (!redisClient.isOpen) await redisClient.connect();
      await redisClient.del(key);
      return true;
    } catch (err) {
      logger.error({ err, key }, 'Failed to delete from cache');
      return false;
    }
  }

  /**
   * Increment a value (useful for rate limiting or counters)
   * @param {string} key 
   */
  async incr(key) {
    try {
      if (!redisClient.isOpen) await redisClient.connect();
      return await redisClient.incr(key);
    } catch (err) {
      logger.error({ err, key }, 'Failed to increment cache key');
      return null;
    }
  }

  /**
   * Check if a key exists
   * @param {string} key 
   */
  async exists(key) {
    try {
      if (!redisClient.isOpen) await redisClient.connect();
      return await redisClient.exists(key);
    } catch (err) {
      logger.error({ err, key }, 'Failed to check existence in cache');
      return false;
    }
  }
}

module.exports = new CacheRepository();
