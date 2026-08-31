const jwt = require('jsonwebtoken');

// Middleware untuk memverifikasi token JWT yang valid
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_fallback');
    req.user = decoded; // Menyimpan data pengguna (id, email, role) ke request
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token tidak valid atau telah kadaluwarsa.' });
  }
};

// Middleware untuk membatasi akses khusus Role ADMIN
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Akses dilarang. Membutuhkan hak akses Administrator.' });
  }
  next();
};

// Middleware untuk memvalidasi edit/delete mandiri (harus milik user sendiri atau Admin)
const requireSelfOrAdmin = (req, res, next) => {
  const paramEmail = req.params.email;
  const loggedInEmail = req.user?.email;
  const loggedInRole = req.user?.role;

  if (loggedInRole === 'ADMIN' || loggedInEmail === paramEmail) {
    return next();
  }

  return res.status(403).json({ error: 'Akses dilarang. Anda hanya dapat mengubah data milik Anda sendiri.' });
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireSelfOrAdmin
};
