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

// Auth Endpoints
app.post('/api/auth/register', authLimiter, authController.register);
app.post('/api/auth/login', authLimiter, authController.login);
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
