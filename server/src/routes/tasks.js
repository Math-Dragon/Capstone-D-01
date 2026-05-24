const express = require('express');
const router = express.Router();
const { z } = require('zod');
const taskService = require('../services/task.service');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { createTaskSchema, updateTaskSchema, taskStatusEnum, statusTransitionSchema } = require('../models/task.model');
const logger = require('../utils/logger');

router.use(authenticate);

const listTasksQuerySchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: taskStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

router.get('/', validate({ query: listTasksQuerySchema }), async (req, res, next) => {
  try {
    const tasks = await taskService.list(req.user.id, req.query);
    res.json({ success: true, data: tasks });
  } catch (err) { next(err); }
});

router.post('/', validate({ body: createTaskSchema }), async (req, res, next) => {
  try {
    const task = await taskService.create(req.user.id, req.body);
    res.status(201).json({ success: true, data: task });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const task = await taskService.getById(req.user.id, req.params.id);
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
});

router.put('/:id', validate({ body: updateTaskSchema }), async (req, res, next) => {
  try {
    const task = await taskService.update(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
});

router.patch('/:id', validate({ body: updateTaskSchema }), async (req, res, next) => {
  try {
    const task = await taskService.update(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
});

router.patch('/:id/status', validate({ body: statusTransitionSchema }), async (req, res, next) => {
  try {
    const { status, actual_duration, skip_reason } = req.body;
    const original = await taskService.getById(req.user.id, req.params.id);
    const task = await taskService.updateStatus(req.user.id, req.params.id, status, { actual_duration, skip_reason });

    logger.info({
      request_id: req.requestId,
      action: 'task_status_changed',
      task_id: task.id,
      from: original.status,
      to: status,
      actual_duration: task.actual_duration,
      skip_reason,
    });

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
