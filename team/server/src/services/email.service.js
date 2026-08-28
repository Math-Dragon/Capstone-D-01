const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtp.host) return null;

  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return transporter;
}

async function sendPasswordResetOtp({ to, otp, expiresInMinutes }) {
  const subject = 'Kode reset password StepUp';
  const text = `Kode reset password kamu: ${otp}\n\nKode ini berlaku selama ${expiresInMinutes} menit. Jika kamu tidak meminta reset password, abaikan email ini.`;

  const transport = getTransporter();
  if (!transport) {
    if (config.isProduction) {
      const err = new Error('Email provider not configured');
      err.statusCode = 503;
      err.code = 'EMAIL_UNAVAILABLE';
      throw err;
    }
    logger.info({ event: 'email_dev_fallback', to, expiresInMinutes }, 'Password reset OTP (dev console fallback)');
    return { devFallback: true };
  }

  await transport.sendMail({
    from: config.mailFrom,
    to,
    subject,
    text,
  });
  return { devFallback: false };
}

async function sendPhoneVerifyOtp({ to, otp, expiresInMinutes }) {
  const subject = 'Kode verifikasi nomor telepon StepUp';
  const text = `Kode verifikasi nomor telepon kamu: ${otp}\n\nKode ini berlaku selama ${expiresInMinutes} menit.`;

  const transport = getTransporter();
  if (!transport) {
    if (config.isProduction) {
      const err = new Error('Email provider not configured');
      err.statusCode = 503;
      throw err;
    }
    logger.info({ event: 'email_dev_fallback', to, expiresInMinutes }, 'Phone verify OTP via email dev fallback (unused for SMS flow)');
    return { devFallback: true };
  }

  await transport.sendMail({ from: config.mailFrom, to, subject, text });
  return { devFallback: false };
}

module.exports = { sendPasswordResetOtp, sendPhoneVerifyOtp, getTransporter };
