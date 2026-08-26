require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('../config/db');
const authController = require('../controllers/authController');

const app = express();

// 1. Security & Core Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// 2. Serverless DB Connection Middleware (Wajib untuk Vercel)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: "Database connection failed: " + err.message });
  }
});

// 3. Rate Limiter Configuration (Max 10 request / 15 menit)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts from this IP, please try again after 15 minutes." }
});

// 4. Endpoints Definition
app.get('/', (req, res) => {
  res.json({ message: "auth-service is running", port: process.env.PORT || 8001 });
});

app.get('/api/auth/health', (req, res) => {
  res.json({ status: "Auth Service Active", port: process.env.PORT || 8001 });
});

app.post('/api/auth/register', authLimiter, authController.register);
app.post('/api/auth/login', authLimiter, authController.login);
app.get('/api/auth/verify', authController.verifyAccount);

// 5. Local Listening (Development Only)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8001;
  app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
}

module.exports = app;
