const express = require('express');
const router = express.Router();
const { z } = require('zod');
const coachRouter = require('../services/coach');
const repos = require('../repositories');
const { authenticate } = require('../middleware/authenticate');
const { aiLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const { coachRequestSchema, decideSchema, decideParamsSchema } = require('../models/coach.model');

router.use(authenticate);

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const auditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  action: z.string().max(50).optional(),
});

router.get('/history', validate({ query: historyQuerySchema }), async (req, res, next) => {
  try {
    const messages = await repos.chatMessage.findByUser(req.user.id);
    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
});

router.get('/recommendations/metrics', async (req, res, next) => {
  try {
    const metrics = await coachRouter.getRecommendationMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
});

router.post('/recommendations/:recId/tasks/:taskId/decide',
  validate({ body: decideSchema, params: decideParamsSchema }),
  async (req, res, next) => {
  try {
    const { decision, session_id } = req.body;
    const result = await coachRouter.decideTask(
      req.user.id,
      req.params.recId,
      req.params.taskId,
      decision,
      session_id
    );
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        status: 'error',
        message: err.message,
      });
    }
    next(err);
  }
});

router.get('/audit', validate({ query: auditQuerySchema }), async (req, res, next) => {
  try {
    const { limit, offset, action } = req.query;
    const [logs, actionCounts] = await Promise.all([
      repos.audit.findByUserId(req.user.id, { limit, offset, action }),
      repos.audit.countByAction(req.user.id),
    ]);
    res.json({ success: true, data: { logs, actionCounts, limit, offset } });
  } catch (err) {
    next(err);
  }
});

router.get('/metrics', async (req, res, next) => {
  try {
    const [studentMetrics, recMetrics] = await Promise.all([
      repos.studentMetrics.findByUserId(req.user.id),
      coachRouter.getRecommendationMetrics(),
    ]);
    res.json({
      success: true,
      data: {
        student: studentMetrics || {
          streak_days: 0, total_completed: 0, total_skipped: 0,
          completion_rate_7d: 0, completion_rate_3d: 0, avg_difficulty_7d: 0,
          consecutive_skips: 0, last_mood: null,
        },
        recommendations: recMetrics,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/undo', async (req, res, next) => {
  try {
    const result = await coachRouter.dispatch(req.user.id, 'UNDO_PLAN', { session_id: req.body?.session_id });
    res.json({
      success: true,
      status: 'ok',
      type: result.type,
      data: {
        ...result.data,
        adaptationType: null,
        triggerId: null,
      },
      meta: result.meta || {},
      server_timestamp: Date.now(),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', aiLimiter, validate({ body: coachRequestSchema }), async (req, res, next) => {
  try {
    const { action, payload } = req.body;
    const result = await coachRouter.dispatch(req.user.id, action, payload);

    res.json({
      success: true,
      status: 'ok',
      type: result.type,
      data: {
        ...result.data,
        adaptationType: result.adaptationType || null,
        triggerId: result.triggerId || null,
      },
      meta: result.meta || {},
      server_timestamp: Date.now(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
