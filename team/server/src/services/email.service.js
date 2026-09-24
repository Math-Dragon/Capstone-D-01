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

async function sendViaSmtp({ to, subject, text }) {
  const transport = getTransporter();
  if (!transport) {
    if (config.isProduction) {
      const err = new Error('Email provider not configured');
      err.statusCode = 503;
      err.code = 'EMAIL_UNAVAILABLE';
      throw err;
    }
    logger.info({ event: 'email_dev_fallback', to, subject }, 'Email (dev console fallback)');
    return { devFallback: true };
  }

  await transport.sendMail({ from: config.mailFrom, to, subject, text });
  return { devFallback: false };
}

// Provider seam: swapping EMAIL_PROVIDER must never require touching call sites.
// Every cost-friendly provider exposes an SMTP relay, so `smtp` covers Brevo,
// SendGrid, Mailgun, SMTP2GO, Amazon SES, Resend, etc. Add an HTTP-API impl
// here only if provider-native features are ever needed.
const providers = {
  smtp: sendViaSmtp,
};

async function send({ to, subject, text }) {
  const provider = providers[config.emailProvider];
  if (!provider) {
    const err = new Error(`Unsupported EMAIL_PROVIDER: ${config.emailProvider}`);
    err.statusCode = 500;
    throw err;
  }
  return provider({ to, subject, text });
}

async function sendPasswordResetOtp({ to, otp, expiresInMinutes }) {
  return send({
    to,
    subject: 'Kode reset password StepUp',
    text: `Kode reset password kamu: ${otp}\n\nKode ini berlaku selama ${expiresInMinutes} menit. Jika kamu tidak meminta reset password, abaikan email ini.`,
  });
}

async function sendLoginOtp({ to, otp, expiresInMinutes }) {
  return send({
    to,
    subject: 'Kode masuk StepUp',
    text: `Kode masuk kamu: ${otp}\n\nKode ini berlaku selama ${expiresInMinutes} menit. Jika kamu tidak meminta kode ini, abaikan email ini.`,
  });
}

async function sendPhoneVerifyOtp({ to, otp, expiresInMinutes }) {
  return send({
    to,
    subject: 'Kode verifikasi nomor telepon StepUp',
    text: `Kode verifikasi nomor telepon kamu: ${otp}\n\nKode ini berlaku selama ${expiresInMinutes} menit.`,
  });
}

module.exports = { send, sendPasswordResetOtp, sendLoginOtp, sendPhoneVerifyOtp, getTransporter };
