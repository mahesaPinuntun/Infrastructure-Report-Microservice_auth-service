require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('../config/db');
const authController = require('../controllers/authController');

const app = express();

// Rule #18: Security Headers
app.use(helmet());

// Rule #11: Rate Limiter for Auth Routes (Max 10 requests per 15 minutes per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts from this IP, please try again after 15 minutes." }
});

app.use(cors());
app.use(express.json());

connectDB();

// Apply Rate Limiter specifically to login & register endpoints

app.post('/', (req, res)) => {
  res.json({message:"auth-service is running" , port: process.env.PORT || 8001 });
});
app.post('/api/auth/register', authLimiter, authController.register);
app.post('/api/auth/login', authLimiter, authController.login);
app.get('/api/auth/verify', authController.verifyAccount);

app.get('/api/auth/health', (req, res) => {
  res.json({ status: "Auth Service Active", port: process.env.PORT || 8001 });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8001;
  app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
}

module.exports = app;
