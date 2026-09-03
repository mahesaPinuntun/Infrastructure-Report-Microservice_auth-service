const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Admin, Manager, Technician, User } = require('../models/schemas');
const sendVerificationEmail = require('../utils/emailer');

// Helper untuk memilih Model Mongoose berdasarkan Role
const getModelByRole = (role) => {
  switch (role) {
    case 'ADMIN': return Admin;
    case 'MANAGER': return Manager;
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
    const { name, email, password, phone, phoneNumber, department, specialization } = req.body;

    // Validasi Atribut Wajib Utama
    const missingAttributes = [];
    if (!name || name.trim() === '') missingAttributes.push('name');
    if (!email || email.trim() === '') missingAttributes.push('email');
    if (!password || password.trim() === '') missingAttributes.push('password');

    // Tangkap nomor telepon dari 'phone' atau 'phoneNumber'
    const contactNumber = (phone || phoneNumber || '').trim();
    if (!contactNumber) {
      missingAttributes.push('phoneNumber');
    }

    if (missingAttributes.length > 0) {
      return res.status(400).json({
        error: `Atribut yang dibutuhkan: ${missingAttributes.join(', ')}`,
        missingAttributes
      });
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
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: roleName,
      status: roleName === 'ADMIN' ? 'ACTIVE' : 'PENDING',
      verificationToken,
      tokenExpiresAt,
      // Simpan ke dua field agar kompatibel dengan seluruh skema Mongoose
      phone: contactNumber,
      phoneNumber: contactNumber,
      ...(department && { department: department.trim() }),
      ...(specialization && { specialization: specialization.trim() })
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
        phone: newUser.phone || newUser.phoneNumber || '',
        phoneNumber: newUser.phoneNumber || newUser.phone || '',
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('[auth-service] Registration Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// =========================================================================
// 2. HELPER LOGIN INTERNAL
// =========================================================================
const executeLogin = async (req, res, roleName) => {
  try {
    const { email, password } = req.body;

    const missingAttributes = [];
    if (!email || email.trim() === '') missingAttributes.push('email');
    if (!password || password.trim() === '') missingAttributes.push('password');

    if (missingAttributes.length > 0) {
      return res.status(400).json({
        error: `Atribut yang dibutuhkan: ${missingAttributes.join(', ')}`,
        missingAttributes
      });
    }

    const TargetModel = getModelByRole(roleName);

    // Cari user di koleksi spesifiknya
    const userDoc = await TargetModel.findOne({ email: email.trim().toLowerCase() });
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
        name: userDoc.name,
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
        phone: userDoc.phone || userDoc.phoneNumber || '',
        phoneNumber: userDoc.phoneNumber || userDoc.phone || '',
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
const registerUser = async (req, res) => {
  await executeRegistration(req, res, 'USER');
};

const registerAdmin = async (req, res) => {
  try {
    const { adminPin } = req.body;

    if (!adminPin || adminPin.trim() === '') {
      return res.status(400).json({
        error: "Atribut yang dibutuhkan: adminPin",
        missingAttributes: ['adminPin']
      });
    }

    const SYSTEM_ADMIN_PIN = process.env.ADMIN_PIN || 'kangkangkubundarahmalagingepel';

    if (adminPin.trim() !== SYSTEM_ADMIN_PIN) {
      return res.status(403).json({ error: "Secret PIN Admin tidak valid." });
    }

    await executeRegistration(req, res, 'ADMIN');
  } catch (error) {
    console.error('[auth-service] Register Admin Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

const registerManager = async (req, res) => {
  await executeRegistration(req, res, 'MANAGER');
};

const registerTechnician = async (req, res) => {
  await executeRegistration(req, res, 'TECHNICIAN');
};

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
    if (!token) {
      return res.status(400).json({
        error: "Atribut yang dibutuhkan: token",
        missingAttributes: ['token']
      });
    }

    const roles = [Admin, Manager, Technician, User];
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

// =========================================================================
// 6. EDIT ACCOUNT HANDLERS
// =========================================================================
const editUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, role, status, phone, phoneNumber, department, specialization } = req.body;

    const roles = [Admin, Manager, Technician, User];
    let targetUser = null;
    let CurrentModel = null;

    for (const Model of roles) {
      targetUser = await Model.findById(userId);
      if (targetUser) {
        CurrentModel = Model;
        break;
      }
    }

    if (!targetUser) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    }

    const contactNumber = phone || phoneNumber || targetUser.phone || targetUser.phoneNumber;

    // Jika role diubah ke model/koleksi lain
    if (role && role.toUpperCase() !== targetUser.role) {
      const newRole = role.toUpperCase();
      const TargetModel = getModelByRole(newRole);

      const newUserDoc = new TargetModel({
        name: name || targetUser.name,
        email: targetUser.email,
        passwordHash: targetUser.passwordHash,
        role: newRole,
        status: status || targetUser.status,
        phone: contactNumber,
        phoneNumber: contactNumber,
        department: department || targetUser.department,
        specialization: specialization || targetUser.specialization
      });

      await newUserDoc.save();
      await CurrentModel.findByIdAndDelete(userId);

      return res.json({
        message: "Pengguna berhasil diperbarui dan dipindahkan ke role baru.",
        user: newUserDoc
      });
    }

    // Update standar pada koleksi yang sama
    if (name) targetUser.name = name;
    if (status) targetUser.status = status;
    if (phone !== undefined || phoneNumber !== undefined) {
      targetUser.phone = contactNumber;
      targetUser.phoneNumber = contactNumber;
    }
    if (department !== undefined) targetUser.department = department;
    if (specialization !== undefined) targetUser.specialization = specialization;

    await targetUser.save();

    return res.json({
      message: "Data pengguna berhasil diperbarui oleh Admin.",
      user: targetUser
    });
  } catch (error) {
    console.error('[auth-service] Edit User By Admin Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

const editUserBySelf = async (req, res) => {
  try {
    const { email } = req.params;
    const { name, password, phone, phoneNumber, department, specialization } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Atribut yang dibutuhkan: email",
        missingAttributes: ['email']
      });
    }

    const roles = [Admin, Manager, Technician, User];
    let targetUser = null;

    for (const Model of roles) {
      targetUser = await Model.findOne({ email });
      if (targetUser) break;
    }

    if (!targetUser) {
      return res.status(404).json({ error: "Pengguna dengan email tersebut tidak ditemukan." });
    }

    const contactNumber = phone || phoneNumber;

    if (name) targetUser.name = name;
    if (contactNumber !== undefined) {
      targetUser.phone = contactNumber;
      targetUser.phoneNumber = contactNumber;
    }
    if (department !== undefined) targetUser.department = department;
    if (specialization !== undefined) targetUser.specialization = specialization;

    if (password) {
      const salt = await bcrypt.genSalt(10);
      targetUser.passwordHash = await bcrypt.hash(password, salt);
    }

    await targetUser.save();

    return res.json({
      message: "Profil Anda berhasil diperbarui.",
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone || targetUser.phoneNumber || '',
        phoneNumber: targetUser.phoneNumber || targetUser.phone || '',
        role: targetUser.role
      }
    });
  } catch (error) {
    console.error('[auth-service] Edit User By Self Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// =========================================================================
// 7. DELETE ACCOUNT HANDLERS
// =========================================================================
const deleteUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const roles = [Admin, Manager, Technician, User];
    let deletedUser = null;

    for (const Model of roles) {
      deletedUser = await Model.findByIdAndDelete(userId);
      if (deletedUser) break;
    }

    if (!deletedUser) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    }

    return res.json({ message: `Pengguna ${deletedUser.email} berhasil dihapus oleh Admin.` });
  } catch (error) {
    console.error('[auth-service] Delete User By Admin Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

const deleteUserBySelf = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        error: "Atribut yang dibutuhkan: email",
        missingAttributes: ['email']
      });
    }

    const roles = [Admin, Manager, Technician, User];
    let deletedUser = null;

    for (const Model of roles) {
      deletedUser = await Model.findOneAndDelete({ email });
      if (deletedUser) break;
    }

    if (!deletedUser) {
      return res.status(404).json({ error: "Pengguna dengan email tersebut tidak ditemukan." });
    }

    return res.json({ message: `Akun ${email} berhasil dihapus.` });
  } catch (error) {
    console.error('[auth-service] Delete User By Self Error:', error);
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
  verifyAccount,
  editUserByAdmin,
  editUserBySelf,
  deleteUserByAdmin,
  deleteUserBySelf
};
