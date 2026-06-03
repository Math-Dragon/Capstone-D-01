const config = require('../config');

function requireAdmin(req, res, next) {
  const adminEmails = config.adminEmails;

  if (!adminEmails || adminEmails.length === 0) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access not configured' } });
  }

  if (!req.user || !req.user.email) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  if (!adminEmails.includes(req.user.email)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access denied' } });
  }

  next();
}

module.exports = { requireAdmin };
