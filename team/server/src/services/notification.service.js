const emailService = require('./email.service');
const smsService = require('./sms.service');

async function sendPasswordResetOtp({ channel, to, otp, expiresInMinutes }) {
  if (channel === 'email') {
    return emailService.sendPasswordResetOtp({ to, otp, expiresInMinutes });
  }
  if (channel === 'sms') {
    return smsService.sendPasswordResetOtp({ to, otp, expiresInMinutes });
  }
  const err = new Error('Unsupported notification channel');
  err.statusCode = 400;
  throw err;
}

async function sendLoginOtp({ to, otp, expiresInMinutes }) {
  return emailService.sendLoginOtp({ to, otp, expiresInMinutes });
}

async function sendPhoneVerifyOtp({ to, otp, expiresInMinutes }) {
  return smsService.sendPhoneVerifyOtp({ to, otp, expiresInMinutes });
}

module.exports = { sendPasswordResetOtp, sendLoginOtp, sendPhoneVerifyOtp };
