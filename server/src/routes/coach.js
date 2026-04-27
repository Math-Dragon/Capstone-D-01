const express = require('express');
const router = express.Router();
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

router.post('/', aiLimiter, async (req, res, next) => {
  try {
    const { action, payload } = coachActionSchema.parse(req.body);
    const result = await coachRouter.dispatch(req.user.id, action, payload);

    res.json({
      success: true,
      status: 'ok',
      type: result.type,
      data: result.data,
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
