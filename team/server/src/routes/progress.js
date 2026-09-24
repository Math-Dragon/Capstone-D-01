const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const progressService = require('../services/progress.service');
const {
  createEventSchema,
  historyQuerySchema,
  historyParamsSchema,
  correctionSchema,
  overviewQuerySchema,
} = require('../models/check-in-event.model');

const ISO_WEEK_REGEX = /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/;

const trendQuerySchema = z.object({
  from: z.string().max(20).optional(),
  to: z.string().max(20).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

router.use(authenticate);

router.post('/events', validate({ body: createEventSchema }), async (req, res, next) => {
  try {
    const result = await progressService.createEvent(req.user.id, req.body);
    res.status(result.replayed ? 200 : 201).json({
      success: true,
      data: result.data,
      meta: { idempotent_replay: result.replayed },
    });
  } catch (err) { next(err); }
});

router.get('/history', validate({ query: historyQuerySchema }), async (req, res, next) => {
  try {
    const data = await progressService.getHistory(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/history/:id', validate({ params: historyParamsSchema }), async (req, res, next) => {
  try {
    const data = await progressService.getHistoryDetail(req.user.id, req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch('/history/:id', validate({ params: historyParamsSchema, body: correctionSchema }), async (req, res, next) => {
  try {
    const data = await progressService.correctHistory(req.user.id, req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/history/:id', validate({ params: historyParamsSchema }), async (req, res, next) => {
  try {
    const data = await progressService.deleteHistory(req.user.id, req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/overview', validate({ query: overviewQuerySchema }), async (req, res, next) => {
  try {
    const data = await progressService.getOverview(req.user.id, req.query.period);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

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

router.get('/trend', validate({ query: trendQuerySchema }), async (req, res, next) => {
  try {
    const { from, to, limit, offset } = req.query;
    const data = await progressService.getTrend(req.user.id, {
      from, to,
      limit,
      offset,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
