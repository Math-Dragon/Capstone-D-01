const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const { requireAdmin } = require('../middleware/requireAdmin');
const { generalLimiter } = require('../middleware/rateLimiter');
const { getAdminMetrics } = require('../services/admin.service');

router.get('/metrics', authenticate, requireAdmin, generalLimiter, async (req, res, next) => {
  try {
    const data = await getAdminMetrics();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
