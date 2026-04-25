const express = require('express');
const router = express.Router();
const { z } = require('zod');
const goalService = require('../services/goal.service');
const { authenticate } = require('../middleware/authenticate');

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
});

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const goals = await goalService.list(req.user.id, req.query);
    res.json({ success: true, data: goals });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const goal = await goalService.create(req.user.id, data);
    res.status(201).json({ success: true, data: goal });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const goal = await goalService.getById(req.user.id, req.params.id);
    res.json({ success: true, data: goal });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const goal = await goalService.update(req.user.id, req.params.id, data);
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
