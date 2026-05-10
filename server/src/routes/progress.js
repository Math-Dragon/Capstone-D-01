const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const progressService = require('../services/progress.service');

const ISO_WEEK_REGEX = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;

router.use(authenticate);

router.get('/stats', async (req, res, next) => {
  try {
    const data = await progressService.getStats(req.user.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/weekly', async (req, res, next) => {
  try {
    const { week } = req.query;
    if (!week) {
      const err = new Error('Week parameter required');
      err.statusCode = 400;
      throw err;
    }
    if (!ISO_WEEK_REGEX.test(week)) {
      const err = new Error('Week must be in ISO format: YYYY-WNN (e.g., 2026-W18)');
      err.statusCode = 400;
      throw err;
    }
    const snapshot = await progressService.getWeekly(req.user.id, week);
    res.json({ success: true, data: snapshot });
  } catch (err) { next(err); }
});

router.get('/trend', async (req, res, next) => {
  try {
    const { from, to, limit, offset } = req.query;
    const data = await progressService.getTrend(req.user.id, {
      from, to,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
