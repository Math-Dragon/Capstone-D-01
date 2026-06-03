const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { authenticate } = require('../middleware/authenticate');
const { requireAdmin } = require('../middleware/requireAdmin');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const { getAdminMetrics } = require('../services/admin.service');

const metricsQuerySchema = z.object({
  activity_limit: z.coerce.number().int().min(1).max(200).optional(),
  activity_offset: z.coerce.number().int().min(0).optional(),
  search: z.string().max(100).optional(),
  action: z.string().max(50).optional(),
  dateFrom: z.string().max(20).optional(),
  dateTo: z.string().max(20).optional(),
  provider: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  status: z.enum(['success', 'error']).optional(),
});

router.get('/metrics', authenticate, requireAdmin, generalLimiter, validate({ query: metricsQuerySchema }), async (req, res, next) => {
  try {
    const data = await getAdminMetrics(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
