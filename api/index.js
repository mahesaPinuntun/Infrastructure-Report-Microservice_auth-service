const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('../config/db');
const authController = require('../controllers/authController');

const app = express();

// 1. Tangani CORS & Preflight OPTIONS secara Universal (Bebas error path-to-regexp)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://infrastructure-report-microservice-admin-manager.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Langsung balas 200 OK untuk request OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 2. Security & Parser
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());

// 3. Base & Health Check
app.get('/', (req, res) => res.json({ message: "auth-service is running", status: "OK" }));
app.get('/api/auth/health', (req, res) => res.json({ status: "Auth Service Active" }));

// 4. Serverless DB Connection Handler
app.use(async (req, res, next) => {
  try {
    if (typeof connectDB === 'function') await connectDB();
    next();
  } catch (err) {
    console.error('[auth-service] DB Connection Error:', err);
    res.status(500).json({ error: "Database connection failed: " + err.message });
  }
});

// 5. Rate Limiter & Endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });

app.post('/api/auth/login/admin', authLimiter, authController.loginAdmin);
app.post('/api/auth/login/manager', authLimiter, authController.loginManager);
app.post('/api/auth/login/user', authLimiter, authController.loginUser);
app.post('/api/auth/login/technician', authLimiter, authController.loginTechnician);

app.post('/api/auth/register/user', authLimiter, authController.registerUser);
app.post('/api/auth/register/admin', authLimiter, authController.registerAdmin);
app.post('/api/auth/register/manager', authLimiter, authController.registerManager);
app.post('/api/auth/register/technician', authLimiter, authController.registerTechnician);

app.get('/api/auth/verify', authController.verifyAccount);

// Global Error Handler
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
