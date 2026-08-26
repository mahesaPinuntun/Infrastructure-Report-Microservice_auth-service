const mongoose = require('mongoose');

const connectDB = async () => {
  // 1. Jika sudah terhubung, langsung reuse koneksi yang ada
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  // 2. Hubungkan ke MongoDB Atlas
  await mongoose.connect(process.env.MONGO_URI, {
    tls: true,
    serverSelectionTimeoutMS: 5000,
    bufferCommands: false // Matikan buffering agar jika db mati langsung error, bukan menggantung
  });

  console.log('[auth-service] Connected to MongoDB Atlas');
};

module.exports = connectDB;
