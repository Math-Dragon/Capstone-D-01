const logger = require('../utils/logger');
class CircuitBreaker {
  constructor(options = {}) {
    this.failureCount = 0;
    this.threshold = options.threshold || 3;
    this.cooldownMs = options.cooldownMs || 5 * 60 * 1000; // 5 menit
    this.state = 'closed'; // closed = normal, open = blocked, half-open = testing
    this.lastFailureTime = null;
  }
  async execute(fn) {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.cooldownMs) {
        this.state = 'half-open';
        logger.info({ action: 'circuit_breaker_half_open' });
      } else {
        throw new Error('Layanan AI sedang tidak tersedia. Coba lagi nanti.');
      }
    }
    try {
      const result = await fn();
      if (this.state === 'half-open') {
        logger.info({ action: 'circuit_breaker_recovered' });
      }
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      logger.warn({ action: 'circuit_breaker_open', failures: this.failureCount });
    }
  }
  reset() {
    this.failureCount = 0;
    this.state = 'closed';
  }
  getState() {
    return { state: this.state, failures: this.failureCount };
  }
}
module.exports = new CircuitBreaker();