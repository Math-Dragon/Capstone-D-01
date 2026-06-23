const express = require('express');
const router = express.Router();
const repos = require('../repositories');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { webhookRegistrationSchema } = require('../models/webhook-subscription.model');

router.post('/register', authenticate, validate({ body: webhookRegistrationSchema }), async (req, res, next) => {
  try {
    const subscription = await repos.webhookSubscription.upsertForUser(req.user.id, req.body);
    res.status(201).json({ success: true, data: subscription });
  } catch (err) { next(err); }
});

module.exports = router;
