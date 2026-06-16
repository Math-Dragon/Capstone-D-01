const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { authenticate } = require('../middleware/authenticate');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../models/user.model');
const config = require('../config');

router.post('/register', validate({ body: registerSchema }), async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
});

router.post('/login', validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.cookie('refreshToken', result.refreshToken, config.refreshCookieOptions);
    res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) { next(err); }
});

router.post('/google', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      const err = new Error('idToken is required');
      err.statusCode = 400;
      throw err;
    }
    const result = await authService.googleLogin(idToken);
    res.cookie('refreshToken', result.refreshToken, config.refreshCookieOptions);
    res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
  } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      const err = new Error('No refresh token');
      err.statusCode = 401;
      throw err;
    }
    const result = await authService.refresh(refreshToken);
    res.cookie('refreshToken', result.refreshToken, config.refreshCookieOptions);
    res.json({ success: true, data: { accessToken: result.accessToken } });
  } catch (err) { next(err); }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, data: req.user });
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await authService.logout(req.user.id, req.cookies.refreshToken);
    res.clearCookie('refreshToken');
    res.json({ success: true, data: { message: 'Logged out' } });
  } catch (err) { next(err); }
});

module.exports = router;
