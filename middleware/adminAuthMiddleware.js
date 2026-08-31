const jwt = require('jsonwebtoken');

// Middleware Verifikasi Token & Restriksi Khusus ADMIN
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Token Administrator tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_fallback');
    
    // Pastikan role hasil ekstraksi token JWT adalah ADMIN
    if (!decoded || decoded.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Akses dilarang. Pembuatan/Pengelolaan akun ini hanya dapat dilakukan oleh Administrator.' 
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token Administrator tidak valid atau telah kadaluwarsa.' });
  }
};

module.exports = {
  authenticateAdmin
};
