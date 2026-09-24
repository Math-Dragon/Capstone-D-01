const express = require('express');
const router = express.Router();
const config = require('../config');
const authService = require('../services/auth.service');

// OAuth 2.0 extension grant (RFC 6749 §4.5) for passwordless email OTP login.
const GRANT_EMAIL_OTP = 'urn:stepup:params:grant-type:email-otp';
const GRANT_REFRESH_TOKEN = 'refresh_token';

function requestContext(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

// RFC 6749 §5.2 error response. Opts out of responseEnricher so the body stays spec-shaped.
function oauthError(res, status, error, description) {
  res.locals.skipEnrich = true;
  const body = { error };
  if (description) body.error_description = description;
  return res.status(status).json(body);
}

function tokenResponse(res, result) {
  // Refresh token travels in the httpOnly cookie only. `refresh_token` is OPTIONAL in
  // RFC 6749 §5.1, so omitting it keeps 7-day tokens out of JS-reachable memory.
  res.cookie('refreshToken', result.refreshToken, config.refreshCookieOptions);
  res.locals.skipEnrich = true;
  const body = {
    access_token: result.accessToken,
    token_type: 'Bearer',
    expires_in: config.jwtAccessExpirySeconds,
  };
  if (result.user) body.user = result.user;
  return res.json(body);
}

router.post('/token', async (req, res, next) => {
  try {
    const grantType = req.body.grant_type;

    if (grantType === GRANT_EMAIL_OTP) {
      const { username, otp } = req.body;
      if (!username || !otp) {
        return oauthError(res, 400, 'invalid_request', 'username and otp are required');
      }
      try {
        const result = await authService.verifyLoginOtp(username, otp, requestContext(req));
        return tokenResponse(res, result);
      } catch (err) {
        if (err.code === 'INVALID_OTP') {
          return oauthError(res, 400, 'invalid_grant', 'Invalid or expired code');
        }
        throw err;
      }
    }

    if (grantType === GRANT_REFRESH_TOKEN) {
      const refreshToken = req.body.refresh_token || req.cookies.refreshToken;
      if (!refreshToken) {
        return oauthError(res, 400, 'invalid_request', 'refresh_token is required');
      }
      try {
        const result = await authService.refresh(refreshToken);
        return tokenResponse(res, result);
      } catch (err) {
        if (err.statusCode === 401) {
          return oauthError(res, 400, 'invalid_grant', 'Invalid or expired refresh token');
        }
        throw err;
      }
    }

    return oauthError(
      res,
      400,
      'unsupported_grant_type',
      `Unsupported grant_type: ${grantType || '(missing)'}`,
    );
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
