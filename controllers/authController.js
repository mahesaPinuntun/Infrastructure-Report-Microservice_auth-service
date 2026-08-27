const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Admin, InfrastructureManager, Technician, User } = require('../models/schemas');
const sendVerificationEmail = require('../utils/emailer');

// Helper untuk memilih Model & Collection berdasarkan Role
const getModelByRole = (role) => {
  switch (role) {
    case 'ADMIN': return { model: Admin, collectionName: 'admins' };
    case 'INFRASTRUCTURE_MANAGER': return { model: InfrastructureManager, collectionName: 'infrastructure_managers' };
    case 'TECHNICIAN': return { model: Technician, collectionName: 'technicians' };
    case 'USER': return { model: User, collectionName: 'users' };
    default: return null;
  }
};

// Helper Internal untuk Eksekusi Registrasi (Prevent Code Duplication)
const executeRegistration = async (res, TargetModel, userData, email, name) => {
  const existingUser = await TargetModel.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: "Email already registered." });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(userData.password, salt);
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Hours

  const newUser = new TargetModel({
    ...userData,
    passwordHash,
    verificationToken,
    tokenExpiresAt
  });

  await newUser.save();
  await sendVerificationEmail(email, name, verificationToken);

  return res.status(201).json({
    message: "Registration successful. Please check your email to verify your account."
  });
};

// ----------------------------------------------------
// 1. REGISTRATION ENDPOINTS PER ROLE
// ----------------------------------------------------

// Register Warga / Standard User
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    await executeRegistration(res, User, {
      name,
      email,
      password,
      role: 'USER',
      ...(phoneNumber && { phoneNumber })
    }, email, name);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register System Admin
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    await executeRegistration(res, Admin, {
      name,
      email,
      password,
      role: 'ADMIN',
      ...(phoneNumber && { phoneNumber })
    }, email, name);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register Infrastructure Manager
exports.registerManager = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    await executeRegistration(res, InfrastructureManager, {
      name,
      email,
      password,
      role: 'INFRASTRUCTURE_MANAGER',
      ...(phoneNumber && { phoneNumber }),
      ...(department && { department })
    }, email, name);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Register Technician
exports.registerTechnician = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, specialization } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    await executeRegistration(res, Technician, {
      name,
      email,
      password,
      role: 'TECHNICIAN',
      ...(phoneNumber && { phoneNumber }),
      ...(specialization && { specialization })
    }, email, name);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ----------------------------------------------------
// 2. ACCOUNT EMAIL VERIFICATION
// ----------------------------------------------------
exports.verifyAccount = async (req, res) => {
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

    res.json({ message: "Account successfully verified. You can now login." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ----------------------------------------------------
// 3. LOGIN ENDPOINT
// ----------------------------------------------------
exports.login = async (req, res) => {
  try {
    const { email, password, role = 'USER' } = req.body;

    const target = getModelByRole(role);
    if (!target) return res.status(400).json({ error: "Invalid role specified." });

    const user = await target.model.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid email or password." });

    if (user.status === 'PENDING') {
      return res.status(403).json({ error: "Please verify your email address before logging in." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ error: "Invalid email or password." });

    // Generate JWT Token
    const token = jwt.sign(
      { id: user._id, role, collection: target.collectionName },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
