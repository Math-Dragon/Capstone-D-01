const express = require('express');
const router = express.Router();
const db = require('../db');
const repos = require('../repositories');
const { authenticate } = require('../middleware/authenticate');

router.use(authenticate);

function getISOWeek(date) {
  const tmp = new Date(date);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const year = tmp.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

router.get('/weekly', async (req, res, next) => {
  try {
    const { week_start } = req.query;

    if (!week_start) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Parameter week_start diperlukan' } });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(week_start)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Format week_start tidak valid. Gunakan YYYY-MM-DD' } });
    }

    const weekEnd = new Date(week_start);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const tasksResult = await db.query(
      `SELECT title, planned_date, planned_slot, duration_estimate, status
       FROM tasks
       WHERE goal_id IN (SELECT id FROM goals WHERE user_id = $1)
       AND planned_date BETWEEN $2 AND $3
       ORDER BY planned_date, planned_slot`,
      [req.user.id, week_start, weekEnd.toISOString().split('T')[0]]
    );

    const week = getISOWeek(week_start);
    const progress = await repos.progress.findByUserAndWeek(req.user.id, week);

    res.json({
      success: true,
      data: {
        week: week_start,
        summary: {
          planned_hours: progress?.planned_hours || 0,
          completed_hours: progress?.completed_hours || 0,
          completion_rate: progress?.completion_rate || 0,
        },
        tasks: tasksResult.rows,
        exported_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
