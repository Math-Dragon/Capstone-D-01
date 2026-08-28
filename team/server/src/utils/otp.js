const crypto = require('crypto');
const config = require('../config');

function pepper() {
  return config.otpHashSecret || config.jwtSecret;
}

function hashValue(value) {
  return crypto.createHash('sha256').update(`${value}:${pepper()}`).digest('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function normalizePhoneE164(phone) {
  const trimmed = phone.trim().replace(/\s/g, '');
  if (!/^\+[1-9]\d{7,14}$/.test(trimmed)) {
    const err = new Error('Nomor telepon harus format E.164, contoh +6281234567890');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return trimmed;
}

function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone;
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}

module.exports = {
  hashValue,
  hashToken,
  hashOtp: (otp) => hashValue(`otp:${otp}`),
  hashIdentifier: (identifier) => hashValue(`id:${identifier}`),
  generateOtp,
  generateResetToken,
  normalizeEmail,
  normalizePhoneE164,
  maskPhone,
};
