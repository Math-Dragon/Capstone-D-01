const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const exportService = require('../services/export.service');

const exportQuerySchema = z.object({
  week_start: z.string({ required_error: 'Parameter week_start diperlukan' })
    .date('Format week_start tidak valid. Gunakan YYYY-MM-DD'),
});

router.use(authenticate);

router.get('/weekly', validate({ query: exportQuerySchema }), async (req, res, next) => {
  try {
    const data = await exportService.getWeeklyExport(req.user.id, req.query.week_start);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
