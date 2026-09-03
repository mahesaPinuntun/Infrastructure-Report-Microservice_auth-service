const mongoose = require('mongoose');

// 1. User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'USER' },
  status: { type: String, enum: ['PENDING', 'ACTIVE'], default: 'PENDING' },
  phone: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  department: String,
  verificationToken: String,
  tokenExpiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

// 2. Admin Schema
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'ADMIN' },
  status: { type: String, enum: ['PENDING', 'ACTIVE'], default: 'ACTIVE' },
  phone: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  verificationToken: String,
  tokenExpiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

// 3. Infrastructure Manager Schema
const managerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  department: String,
  role: { type: String, default: 'MANAGER' },
  status: { type: String, enum: ['PENDING', 'ACTIVE'], default: 'PENDING' },
  phone: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  verificationToken: String,
  tokenExpiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

// 4. Technician Schema
const technicianSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  specialization: String,
  role: { type: String, default: 'TECHNICIAN' },
  status: { type: String, enum: ['PENDING', 'ACTIVE'], default: 'PENDING' },
  phone: { type: String, default: '' },
  phoneNumber: { type: String, default: '' },
  verificationToken: String,
  tokenExpiresAt: Date,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');
const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema, 'admins');
const Manager = mongoose.models.Manager || mongoose.model('Manager', managerSchema, 'managers');
const Technician = mongoose.models.Technician || mongoose.model('Technician', technicianSchema, 'technicians');

module.exports = {
  User,
  Admin,
  InfrastructureManager,
  Technician
};
