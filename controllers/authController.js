const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Admin, InfrastructureManager, Technician, User } = require('../models/schemas');
const sendVerificationEmail = require('../utils/emailer');

// Helper untuk memilih Model Mongoose berdasarkan Role
const getModelByRole = (role) => {
  switch (role) {
    case 'ADMIN': return Admin;
    case 'INFRASTRUCTURE_MANAGER': return InfrastructureManager;
    case 'TECHNICIAN': return Technician;
    case 'USER': return User;
    default: return User;
  }
};

// =========================================================================
// 1. HELPER REGISTRASI INTERNAL
// =========================================================================
const executeRegistration = async (req, res, roleName) => {
  try {
    const { name, email, password, phoneNumber, department, specialization } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Nama, email, dan password wajib diisi." });
    }

    const TargetModel = getModelByRole(roleName);

    // Cek apakah email sudah terdaftar di koleksi target
    const existingUser = await TargetModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered." });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Jam

    const newUser = new TargetModel({
      name,
      email,
      passwordHash,
      role: roleName,
      status: roleName === 'ADMIN' ? 'ACTIVE' : 'PENDING',
      verificationToken,
      tokenExpiresAt,
      ...(phoneNumber && { phoneNumber }),
      ...(department && { department }),
      ...(specialization && { specialization })
    });

    await newUser.save();

    // Kirim email verifikasi jika utilitas emailer tersedia
    if (typeof sendVerificationEmail === 'function') {
      try {
        await sendVerificationEmail(email, name, verificationToken);
      } catch (mailErr) {
        console.warn('[auth-service] Email sending failed:', mailErr.message);
      }
    }

    return res.status(201).json({
      message: "Registration successful. Please check your email to verify your account.",
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

    const TargetModel = getModelByRole(roleName);

    // Cari user di koleksi spesifiknya
    const userDoc = await TargetModel.findOne({ email });
    if (!userDoc) {
      return res.status(401).json({ error: "Email atau password salah." });
    }

    // Verifikasi passwordHash di Mongo
    const isMatch = await bcrypt.compare(password, userDoc.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Email atau password salah." });
    }

    const userRole = (userDoc.role || roleName).toUpperCase();

    // Buat JWT Token
    const token = jwt.sign(
      { 
        id: userDoc._id, 
        email: userDoc.email,
        role: userRole 
      },
      process.env.JWT_SECRET || 'secret_key_fallback',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login berhasil',
      token,
      user: {
        id: userDoc._id,
        name: userDoc.name,
        email: userDoc.email,
        role: userRole,
        status: userDoc.status || 'ACTIVE'
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
const registerManager = async (req, res) => executeRegistration(req, res, 'INFRASTRUCTURE_MANAGER');
const registerTechnician = async (req, res) => executeRegistration(req, res, 'TECHNICIAN');

// =========================================================================
// 4. HANDLERS LOGIN PER ROLE
// =========================================================================
const loginUser = async (req, res) => executeLogin(req, res, 'USER');
const loginAdmin = async (req, res) => executeLogin(req, res, 'ADMIN');
const loginManager = async (req, res) => executeLogin(req, res, 'INFRASTRUCTURE_MANAGER');
const loginTechnician = async (req, res) => executeLogin(req, res, 'TECHNICIAN');

// =========================================================================
// 5. ACCOUNT EMAIL VERIFICATION
// =========================================================================
const verifyAccount = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "Verification token is required." });

    const roles = [Admin, InfrastructureManager, Technician, User];
    let foundUser = null;

    for (const Model of roles) {
      foundUser = await Model.findOne({
        verificationToken: token,
        tokenExpiresAt: { $gt: Date.now() }
      });
      if (foundUser) break;
    }

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
