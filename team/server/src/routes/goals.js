const express = require('express');
const router = express.Router();
const { z } = require('zod');
const goalService = require('../services/goal.service');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { createGoalSchema, updateGoalSchema, goalStatusEnum } = require('../models/goal.model');

router.use(authenticate);

const listGoalsQuerySchema = z.object({
  status: goalStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

router.get('/', validate({ query: listGoalsQuerySchema }), async (req, res, next) => {
  try {
    const goals = await goalService.list(req.user.id, req.query);
    res.json({ success: true, data: goals });
  } catch (err) { next(err); }
});

router.post('/', validate({ body: createGoalSchema }), async (req, res, next) => {
  try {
    const goal = await goalService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: goal });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const goal = await goalService.getById(req.user.id, req.params.id);
    res.json({ success: true, data: goal });
  } catch (err) { next(err); }
});

router.put('/:id', validate({ body: updateGoalSchema }), async (req, res, next) => {
  try {
    const goal = await goalService.update(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: goal });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await goalService.delete(req.user.id, req.params.id);
    res.json({ success: true, data: { message: 'Goal deleted' } });
  } catch (err) { next(err); }
});

module.exports = router;
