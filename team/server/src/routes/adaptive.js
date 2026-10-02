const express = require('express');
const { z } = require('zod');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const adaptiveProposalService = require('../services/adaptive-proposal.service');

const router = express.Router();

router.use(authenticate);

const proposalParamsSchema = z.object({ id: z.string().uuid() });

const acceptBodySchema = z.object({
  base_plan_version: z.string().uuid(),
  idempotency_key: z.string().min(8).max(128),
});

const rejectBodySchema = z.object({
  idempotency_key: z.string().min(8).max(128),
});

router.get('/proposals/pending', async (req, res, next) => {
  try {
    const data = await adaptiveProposalService.getPending(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/proposals/:id', validate({ params: proposalParamsSchema }), async (req, res, next) => {
  try {
    const data = await adaptiveProposalService.getById(req.user.id, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/proposals/:id/accept',
  validate({ params: proposalParamsSchema, body: acceptBodySchema }),
  async (req, res, next) => {
    try {
      const data = await adaptiveProposalService.accept(req.user.id, req.params.id, {
        base_plan_version: req.body.base_plan_version,
        idempotency_key: req.body.idempotency_key,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  });

router.post('/proposals/:id/reject',
  validate({ params: proposalParamsSchema, body: rejectBodySchema }),
  async (req, res, next) => {
    try {
      const data = await adaptiveProposalService.reject(req.user.id, req.params.id, {
        idempotency_key: req.body.idempotency_key,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  });

module.exports = router;
