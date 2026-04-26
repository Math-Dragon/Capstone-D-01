const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authenticate');
const progressService = require('../services/progress.service');
const repos = require('../repositories');

router.use(authenticate);

router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const tasks = await repos.task.listByUser(userId);
    const completed = tasks.filter((t) => t.status === 'done' || t.status === 'completed');
    const total = tasks.length;
    const totalMin = tasks.reduce((s, t) => s + (t.duration_estimate || 0), 0);
    const completedMin = completed.reduce((s, t) => s + (t.duration_estimate || 0), 0);

    const difficultyValues = tasks
      .filter((t) => t.feedback_difficulty != null)
      .map((t) => t.feedback_difficulty);
    const avgDifficulty = difficultyValues.length > 0
      ? difficultyValues.reduce((a, b) => a + b, 0) / difficultyValues.length
      : null;

    const metrics = await repos.studentMetrics.findByUserId(userId);

    res.json({
      success: true,
      data: {
        totalTasks: total,
        completedTasks: completed.length,
        totalMinutes: totalMin,
        completedMinutes: completedMin,
        completionRate: total > 0 ? completed.length / total : 0,
        avgDifficulty,
        streakDays: metrics?.streak_days || 0,
        summary: null,
        adaptationNotes: metrics?.last_mood || null,
      },
    });
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
    const snapshot = await progressService.getWeekly(req.user.id, week);
    res.json({ success: true, data: snapshot });
  } catch (err) { next(err); }
});

router.get('/trend', async (req, res, next) => {
  try {
    const { from, to, limit, offset } = req.query;
    const data = await progressService.getTrend(req.user.id, {
      from, to,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
