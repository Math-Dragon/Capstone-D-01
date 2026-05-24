const express = require('express');
const router = express.Router();
const { isHealthy } = require('../db');

router.get('/', async (req, res) => {
  const dbHealthy = await isHealthy();
  const status = dbHealthy ? 'ok' : 'degraded';
  const code = dbHealthy ? 200 : 503;
  res.status(code).json({
    success: dbHealthy,
    data: {
      status,
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
    },
  });
});

module.exports = router;
