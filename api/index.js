const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('../config/db');
const authController = require('../controllers/authController');

// Import Middleware Terpisah
const { authenticateAdmin } = require('../middleware/adminAuthMiddleware');
const { authenticateToken, requireSelfOrAdmin } = require('../middleware/userAuthMiddleware');

const app = express();

// 1. Handling CORS & Preflight OPTIONS Teratas
const allowedOrigins = [
  'https://infrastructure-report-microservice-admin-manager.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8080'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 2. Body Parser & Helmet Config
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());

// 3. Base & Health Check Endpoints (Fast response tanpa butuh koneksi DB)
app.get('/', (req, res) => res.json({ message: "auth-service is running", status: "OK" }));
app.get('/api/auth/health', (req, res) => res.json({ status: "Auth Service Active" }));

// 4. Safe Serverless DB Connection Handler
app.use(async (req, res, next) => {
  try {
    if (typeof connectDB === 'function') {
      await connectDB();
    }
    next();
  } catch (err) {
    console.error('[auth-service] DB Connection Error:', err);
    return res.status(500).json({ error: "Database connection failed: " + err.message });
  }
});

// 5. Rate Limiter Configuration
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." }
});

// ----------------------------------------------------
// Dedicated Registration Endpoints Per Role
// ----------------------------------------------------
// Public: Registrasi User/Warga Biasa & Admin Baru (menggunakan PIN Admin)
app.post('/api/auth/register/user', authLimiter, authController.registerUser);
app.post('/api/auth/register/admin', authLimiter, authController.registerAdmin);

// Protected (Admin Only): Registrasi Manager & Technician oleh Admin yang telah Login
app.post('/api/auth/register/manager', authLimiter, authenticateAdmin, authController.registerManager);
app.post('/api/auth/register/technician', authLimiter, authenticateAdmin, authController.registerTechnician);

// ----------------------------------------------------
// Dedicated Login Endpoints Per Role (Public)
// ----------------------------------------------------
app.post('/api/auth/login/user', authLimiter, authController.loginUser);
app.post('/api/auth/login/admin', authLimiter, authController.loginAdmin);
app.post('/api/auth/login/manager', authLimiter, authController.loginManager);
app.post('/api/auth/login/technician', authLimiter, authController.loginTechnician);

// ----------------------------------------------------
// Account Verification Endpoint (Public)
// ----------------------------------------------------
app.get('/api/auth/verify', authController.verifyAccount);

// ----------------------------------------------------
// User Management Endpoints (Protected)
// ----------------------------------------------------
// Edit & Delete oleh Admin (Wajib Token JWT Admin)
app.put('/api/auth/users/:userId', authenticateAdmin, authController.editUserByAdmin);
app.delete('/api/auth/users/:userId', authenticateAdmin, authController.deleteUserByAdmin);

// Edit & Delete Mandiri oleh User (Wajib Token + Email Milik Sendiri / Admin)
app.put('/api/auth/users/email/:email', authenticateToken, requireSelfOrAdmin, authController.editUserBySelf);
app.delete('/api/auth/users/email/:email', authenticateToken, requireSelfOrAdmin, authController.deleteUserBySelf);

// ----------------------------------------------------
// Global Error Handler
// ----------------------------------------------------
app.use((err, req, res, next) => {
  console.error('[auth-service] Unhandled Error:', err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// Local Development Server Only
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 8001;
  app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
}

module.exports = app;
