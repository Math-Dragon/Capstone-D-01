const express = require('express');
const router = express.Router();
const taskService = require('../services/task.service');
const { authenticate } = require('../middleware/authenticate');
const { createTaskSchema, updateTaskSchema } = require('../models/task.model');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const tasks = await taskService.list(req.user.id, req.query);
    res.json({ success: true, data: tasks });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const data = createTaskSchema.parse(req.body);
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
    const data = updateTaskSchema.parse(req.body);
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
