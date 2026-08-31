const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('../config/db');
const authController = require('../controllers/authController');

const app = express();

// 1. CORS Configuration (Mendukung Credential + Exact Origin)
const corsOptions = {
  origin: [
    'https://infrastructure-report-microservice-admin-manager.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Disable CORP di Helmet agar tidak bertabrakan dengan CORS
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json());

// 2. Base & Health Routes
app.get('/', (req, res) => res.json({ message: "auth-service is running", status: "OK" }));
app.get('/api/auth/health', (req, res) => res.json({ status: "Auth Service Active" }));

// 3. Serverless DB Connection Handler
app.use(async (req, res, next) => {
  try {
    if (typeof connectDB === 'function') await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: "Database connection failed: " + err.message });
  }
});

// 4. Rate Limiter & Endpoints
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

module.exports = app;
