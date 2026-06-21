const express = require('express');
const repos = require('../repositories');
const { authenticate } = require('../middleware/authenticate');
const calendarExportService = require('../services/calendar-export.service');

const router = express.Router();

router.get('/export.ics', authenticate, async (req, res, next) => {
  try {
    const tasks = await repos.task.findScheduledByUser(req.user.id);
    const calendarText = calendarExportService.buildCalendar(req.user.id, tasks);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="stepup-calendar.ics"');
    res.status(200).send(calendarText);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
