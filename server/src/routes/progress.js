const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const progressService = require('../services/progress.service');

router.use(authenticate);

router.get('/weekly', async (req, res, next) => {
  try {
    const { week } = req.query;
    if (!week) {
      const err = new Error('Week parameter required');
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
