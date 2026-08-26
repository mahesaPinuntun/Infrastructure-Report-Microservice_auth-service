const express = require('express');
const connectDB = require('../config/db');
const authRoutes = require('../routes/authRoutes'); // sesuaikan dengan file route kamu

const app = express();
app.use(express.json());

// ✅ Wajib: Await koneksi MongoDB pada setiap request serverless
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(500).json({ error: "Database connection failed: " + err.message });
  }
});

app.use('/api/auth', authRoutes);

module.exports = app;
