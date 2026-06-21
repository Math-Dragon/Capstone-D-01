const config = require('../config');

function requireAdmin(req, res, next) {
  const adminEmails = config.adminEmails;

  if (!adminEmails || adminEmails.length === 0) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses admin belum dikonfigurasi. Hubungi administrator untuk mengatur daftar email admin.' } });
  }

  if (!req.user || !req.user.email) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu untuk mengakses halaman admin.' } });
  }

  if (!adminEmails.includes(req.user.email)) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Akses ditolak. Email Anda tidak terdaftar sebagai admin. Gunakan akun yang telah terdaftar atau hubungi administrator.' } });
  }

  next();
}

module.exports = { requireAdmin };
