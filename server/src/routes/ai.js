const express = require('express');
const router = express.Router();
const aiService = require('../services/ai.service');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { suggestPlanSchema } = require('../models/ai-recommendation.model');

router.use(authenticate);

router.post('/plan/suggest', validate({ body: suggestPlanSchema }), async (req, res, next) => {
  try {
    const result = await aiService.suggestPlan(req.user.id, req.body.goalId, req.body.context);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/recommendations/:id/accept', async (req, res, next) => {
  try {
    const tasks = await aiService.acceptRecommendation(req.user.id, req.params.id);
    res.json({ success: true, data: tasks });
  } catch (err) { next(err); }
});

router.post('/recommendations/:id/reject', async (req, res, next) => {
  try {
    const result = await aiService.rejectRecommendation(req.user.id, req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

module.exports = router;
