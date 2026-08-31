const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('../config/db');
const authController = require('../controllers/authController');

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

// 2. Body Parser & Helmet Config (Bebas dari hambatan CORS)
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

// 5. Rate Limiter (Kapasitas diperlonggar untuk dev & test)
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
app.post('/api/auth/register/user', authLimiter, authController.registerUser);
app.post('/api/auth/register/admin', authLimiter, authController.registerAdmin);
app.post('/api/auth/register/manager', authLimiter, authController.registerManager);
app.post('/api/auth/register/technician', authLimiter, authController.registerTechnician);

// ----------------------------------------------------
// Dedicated Login Endpoints Per Role
// ----------------------------------------------------
app.post('/api/auth/login/user', authLimiter, authController.loginUser);
app.post('/api/auth/login/admin', authLimiter, authController.loginAdmin);
app.post('/api/auth/login/manager', authLimiter, authController.loginManager);
app.post('/api/auth/login/technician', authLimiter, authController.loginTechnician);

// ----------------------------------------------------
// Account Verification Endpoint
// ----------------------------------------------------
app.get('/api/auth/verify', authController.verifyAccount);
// Edit & Delete oleh Admin (by ID)
app.put('/api/auth/users/:userId', authController.editUserByAdmin);
app.delete('/api/auth/users/:userId', authController.deleteUserByAdmin);

// Edit & Delete oleh User (by Email)
app.put('/api/auth/users/email/:email', authController.editUserBySelf);
app.delete('/api/auth/users/email/:email', authController.deleteUserBySelf);
// Global Error Handler (Menangkap exception agar function tidak crash 500)
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
