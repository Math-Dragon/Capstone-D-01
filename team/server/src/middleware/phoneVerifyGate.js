const config = require('../config');

// Phone verification is a paid (Twilio) path kept dormant. It stays 404 unless
// PHONE_VERIFY_ENABLED=true, and — when a whitelist is set — only for listed emails.
function phoneVerifyGate(req, res, next) {
  if (!config.phoneVerifyEnabled) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Not found' },
    });
  }

  const whitelist = config.phoneVerifyWhitelist;
  const email = req.user?.email?.toLowerCase();
  if (whitelist.length > 0 && !whitelist.includes(email)) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Not found' },
    });
  }

  return next();
}

module.exports = { phoneVerifyGate };
