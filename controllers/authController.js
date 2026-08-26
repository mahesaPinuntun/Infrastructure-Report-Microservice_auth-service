const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Admin, InfrastructureManager, Technician, User } = require('../models/schemas'); //watch this later
const sendVerificationEmail = require('../utils/emailer');

// Helper untuk memilih Model berdasarkan Role
const getModelByRole = (role) => {
  switch (role) {
    case 'ADMIN': return { model: Admin, collectionName: 'admins' };
    case 'INFRASTRUCTURE_MANAGER': return { model: InfrastructureManager, collectionName: 'infrastructure_managers' };
    case 'TECHNICIAN': return { model: Technician, collectionName: 'technicians' };
    case 'USER': return { model: User, collectionName: 'users' };
    default: return null;
  }
};

// 1. Register User / Entity
exports.register = async (req, res) => {
  try {
    const { name, email, password, role = 'USER', phoneNumber, department, specialization } = req.body;

    // Parameterize & Validate Input (#13, #14)
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const target = getModelByRole(role);
    if (!target) return res.status(400).json({ error: "Invalid role specified." });

    const existingUser = await target.model.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already registered." });

    // Hash Password (#10)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const newUser = new target.model({
      name,
      email,
      passwordHash,
      verificationToken,
      tokenExpiresAt,
      ...(phoneNumber && { phoneNumber }),
      ...(department && { department }),
      ...(specialization && { specialization })
    });

    await newUser.save();

    // Kirim Email via Brevo
    await sendVerificationEmail(email, name, verificationToken);

    res.status(201).json({
      message: "Registration successful. Please check your email to verify your account."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. Account Email Verification
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

// 3. Login
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

    // Trim API Response (#17)
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