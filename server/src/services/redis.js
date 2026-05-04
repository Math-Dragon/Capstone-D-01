const { createClient } = require('redis');
const config = require('../config');
const logger = require('../utils/logger');

class RedisService {
  constructor() {
    this._connecting = null;
    this.client = createClient({
      url: config.redisUrl || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 50, 2000);
        }
      }
    });

    this.client.on('error', (err) => logger.error({ err }, 'Redis Client Error'));
    this.client.on('connect', () => logger.info('Redis Client Connected'));
    this.client.on('reconnecting', () => logger.warn('Redis Client Reconnecting'));
    this.client.on('ready', () => logger.info('Redis Client Ready'));
  }

  async connect() {
    if (this.client.isOpen) return;
    if (!this._connecting) {
      this._connecting = this.client.connect().finally(() => {
        this._connecting = null;
      });
    }
    return this._connecting;
  }

  async quit() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }
}

const redisService = new RedisService();

module.exports = {
  redisClient: redisService.client,
  connectRedis: () => redisService.connect(),
  closeRedis: () => redisService.quit()
};
