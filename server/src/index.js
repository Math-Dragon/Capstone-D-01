const { pool, isHealthy } = require('./db');
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { connectRedis, redisClient } = require('./services/redis');

Promise.all([isHealthy(), connectRedis()])
  .then(([dbOk]) => {
    if (!dbOk) throw new Error('Database health check failed');
    logger.info('Services connected');
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });

    const shutdown = (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(() => {
        Promise.all([pool.end(), redisClient.quit()]).then(() => {
          logger.info('Services closed');
          process.exit(0);
        });
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    logger.error({ err: err.message }, 'Startup failed');
    process.exit(1);
  });
