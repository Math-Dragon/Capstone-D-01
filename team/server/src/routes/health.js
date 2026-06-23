const express = require('express');
const router = express.Router();
const config = require('../config');
const { isHealthy } = require('../db');
const { getCircuitBreakerState } = require('../services/llm-client');

router.get('/', async (req, res) => {
  const dbHealthy = await isHealthy();
  const status = dbHealthy ? 'ok' : 'degraded';
  const code = dbHealthy ? 200 : 503;
  const ai = getCircuitBreakerState();
  res.status(code).json({
    success: dbHealthy,
    data: {
      status,
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      ai: {
        status: ai.status,
        provider: config.llmProvider,
        configured: config.aiConfigured,
      },
    },
  });
});

module.exports = router;
