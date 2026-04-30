const express = require('express');
const router = express.Router();
const { z } = require('zod');
const coachRouter = require('../services/coach-router.service');
const repos = require('../repositories');
const { authenticate } = require('../middleware/authenticate');
const { aiLimiter } = require('../middleware/rateLimiter');
const { coachActionSchema } = require('../models/coach.model');

router.use(authenticate);

router.get('/history', async (req, res, next) => {
  try {
    const messages = await repos.chatMessage.findByUser(req.user.id);
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

router.get('/recommendations/metrics', async (req, res, next) => {
  try {
    const metrics = await coachRouter.getRecommendationMetrics();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

router.post('/recommendations/:recId/tasks/:taskId/decide', async (req, res, next) => {
  try {
    const decideSchema = z.object({
      decision: z.enum(['accepted', 'rejected']),
      session_id: z.string().optional(),
    });
    const { decision, session_id } = decideSchema.parse(req.body);
    const result = await coachRouter.decideTask(
      req.user.id,
      req.params.recId,
      req.params.taskId,
      decision,
      session_id
    );
    res.json({ success: true, data: result });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        status: 'error',
        error_code: 'VALIDATION_FAILED',
        message: err.errors.map((e) => e.message).join(', '),
      });
    }
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

router.get('/audit', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const [logs, actionCounts] = await Promise.all([
      repos.audit.findByUserId(req.user.id, { limit, offset, action: req.query.action }),
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

router.post('/', aiLimiter, async (req, res, next) => {
  try {
    const { action, payload } = coachActionSchema.parse(req.body);
    const result = await coachRouter.dispatch(req.user.id, action, payload);

    res.json({
      success: true,
      status: 'ok',
      type: result.type,
      data: result.data,
      meta: result.meta || {},
      server_timestamp: Date.now(),
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        status: 'error',
        error_code: 'VALIDATION_FAILED',
        message: err.errors.map((e) => e.message).join(', '),
      });
    }
    next(err);
  }
});

module.exports = router;
