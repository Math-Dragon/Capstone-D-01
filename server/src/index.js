const { pool, isHealthy } = require('./db');
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

isHealthy()
  .then((ok) => {
    if (!ok) throw new Error('Database health check failed');
    logger.info('Database connected');
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });

    const shutdown = (signal) => {
      logger.info(`${signal} received, shutting down gracefully`);
      server.close(() => {
        pool.end().then(() => {
          logger.info('Pool closed');
          process.exit(0);
        });
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err) => {
    logger.error({ err: err.message }, 'Database connection failed');
    process.exit(1);
  });
