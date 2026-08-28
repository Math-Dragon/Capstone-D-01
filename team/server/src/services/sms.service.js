const twilio = require('twilio');
const config = require('../config');
const logger = require('../utils/logger');

let client;

function getClient() {
  if (client) return client;
  if (!config.twilio.accountSid || !config.twilio.authToken) return null;
  client = twilio(config.twilio.accountSid, config.twilio.authToken);
  return client;
}

async function sendPasswordResetOtp({ to, otp, expiresInMinutes }) {
  const body = `Kode reset password StepUp kamu: ${otp}. Berlaku ${expiresInMinutes} menit. Abaikan jika kamu tidak meminta ini.`;
  return sendSms({ to, body, context: 'password_reset', expiresInMinutes });
}

async function sendPhoneVerifyOtp({ to, otp, expiresInMinutes }) {
  const body = `Kode verifikasi StepUp kamu: ${otp}. Berlaku ${expiresInMinutes} menit.`;
  return sendSms({ to, body, context: 'phone_verify', expiresInMinutes });
}

async function sendSms({ to, body, context, expiresInMinutes }) {
  const twilioClient = getClient();
  if (!twilioClient || !config.twilio.fromNumber) {
    if (config.isProduction) {
      const err = new Error('SMS provider not configured');
      err.statusCode = 503;
      err.code = 'SMS_UNAVAILABLE';
      throw err;
    }
    logger.info({ event: 'sms_dev_fallback', context, to, expiresInMinutes }, 'SMS OTP (dev console fallback)');
    return { devFallback: true };
  }

  await twilioClient.messages.create({
    from: config.twilio.fromNumber,
    to,
    body,
  });
  return { devFallback: false };
}

module.exports = { sendPasswordResetOtp, sendPhoneVerifyOtp };
