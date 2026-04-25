const express = require('express');
const router = express.Router();
const { z } = require('zod');
const taskService = require('../services/task.service');
const { authenticate } = require('../middleware/authenticate');

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  duration_estimate: z.number().int().min(25).max(90),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  planned_slot: z.enum(['morning', 'afternoon', 'evening']).optional(),
  goal_id: z.string().uuid(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  duration_estimate: z.number().int().min(25).max(90).optional(),
  planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  planned_slot: z.enum(['morning', 'afternoon', 'evening']).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  actual_duration: z.number().int().nullable().optional(),
});

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const tasks = await taskService.list(req.user.id, req.query);
    res.json({ success: true, data: tasks });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);
    const task = await taskService.create(req.user.id, data);
    res.status(201).json({ success: true, data: task });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const task = await taskService.getById(req.user.id, req.params.id);
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const data = updateSchema.parse(req.body);
    const task = await taskService.update(req.user.id, req.params.id, data);
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await taskService.delete(req.user.id, req.params.id);
    res.json({ success: true, data: { message: 'Task deleted' } });
  } catch (err) { next(err); }
});

module.exports = router;
