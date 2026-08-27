const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('../config/db');
const authController = require('../controllers/authController');

const app = express();

// Security & Body Parser
app.use(helmet());
app.use(cors());
app.use(express.json());

// Serverless DB Connection Handler
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[auth-service] DB Connection Error:', err);
    res.status(500).json({ error: "Database connection failed: " + err.message });
  }
});

// Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." }
});

// Base & Health Routes
app.get('/', (req, res) => {
  res.json({ message: "auth-service is running", status: "OK" });
});

app.get('/api/auth/health', (req, res) => {
  res.json({ status: "Auth Service Active" });
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

// Global Error Handler (Prevents Function Crash)
app.use((err, req, res, next) => {
  console.error('[auth-service] Unhandled Error:', err);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// Local Development Server
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 8001;
  app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
}

module.exports = app;
