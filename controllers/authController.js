const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models/Entities'); // Satu model unified User/Entities
const sendVerificationEmail = require('../utils/emailer');

// =========================================================================
// 1. HELPER REGISTRASI INTERNAL
// =========================================================================
const executeRegistration = async (req, res, roleName) => {
  try {
    const { name, email, password, phoneNumber, department, specialization } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nama, email, dan password wajib diisi." });
    }

    // Cek apakah email sudah terdaftar
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email sudah terdaftar." });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Jam

    const newUser = new User({
      name,
      email,
      password, // Password akan di-hash oleh pre-save hook di Entities.js
      role: roleName,
      status: 'PENDING_VERIFICATION',
      verificationToken,
      tokenExpiresAt,
      ...(phoneNumber && { phoneNumber }),
      ...(department && { department }),
      ...(specialization && { specialization })
    });

    await newUser.save();

    // Kirim email verifikasi jika utilitas emailer tersedia
    if (typeof sendVerificationEmail === 'function') {
      await sendVerificationEmail(email, name, verificationToken);
    }

    return res.status(201).json({
      message: "Registrasi berhasil. Silakan cek email Anda untuk verifikasi akun.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('[auth-service] Registration Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// =========================================================================
// 2. HELPER LOGIN INTERNAL (Urutan Wajib: req, res, roleName)
// =========================================================================
const executeLogin = async (req, res, roleName) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email dan password wajib diisi." });
    }

    // Cari user berdasarkan email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Email atau password salah." });
    }

    // Verifikasi kata sandi
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Email atau password salah." });
    }

    // Pastikan role sesuai jika diminta role spesifik
    const userRole = (user.role || roleName).toUpperCase();

    // Buat JWT Token yang membawa id, email, dan role
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        role: userRole 
      },
      process.env.JWT_SECRET || 'secret_key_fallback',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login berhasil',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: userRole,
        status: user.status || 'ACTIVE'
      }
    });

  } catch (error) {
    console.error('[auth-service] Execute Login Error:', error);
    return res.status(500).json({ error: error.message || 'Gagal memproses token login.' });
  }
};

// =========================================================================
// 3. HANDLERS REGISTRASI PER ROLE
// =========================================================================
const registerUser = async (req, res) => executeRegistration(req, res, 'USER');
const registerAdmin = async (req, res) => executeRegistration(req, res, 'ADMIN');
const registerManager = async (req, res) => executeRegistration(req, res, 'MANAGER');
const registerTechnician = async (req, res) => executeRegistration(req, res, 'TECHNICIAN');

// =========================================================================
// 4. HANDLERS LOGIN PER ROLE
// =========================================================================
const loginUser = async (req, res) => executeLogin(req, res, 'USER');
const loginAdmin = async (req, res) => executeLogin(req, res, 'ADMIN');
const loginManager = async (req, res) => executeLogin(req, res, 'MANAGER');
const loginTechnician = async (req, res) => executeLogin(req, res, 'TECHNICIAN');

// =========================================================================
// 5. ACCOUNT EMAIL VERIFICATION
// =========================================================================
const verifyAccount = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Verification token is required." });

    const foundUser = await User.findOne({
      verificationToken: token,
      tokenExpiresAt: { $gt: Date.now() }
    });

    if (!foundUser) {
      return res.status(400).json({ error: "Invalid or expired verification token." });
    }

    foundUser.status = 'ACTIVE';
    foundUser.verificationToken = undefined;
    foundUser.tokenExpiresAt = undefined;
    await foundUser.save();

    return res.json({ message: "Account successfully verified. You can now login." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  executeRegistration,
  executeLogin,
  registerUser,
  registerAdmin,
  registerManager,
  registerTechnician,
  loginUser,
  loginAdmin,
  loginManager,
  loginTechnician,
  verifyAccount
};
