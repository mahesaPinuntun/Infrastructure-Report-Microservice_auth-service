const mongoose = require('mongoose');

const baseUserFields = {
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'ACTIVE', 'SUSPENDED'], default: 'PENDING' },
  avatarUrl: { type: String, default: '' },
  verificationToken: { type: String },
  tokenExpiresAt: { type: Date }
};

const Admin = mongoose.model('Admin', new mongoose.Schema(baseUserFields, { timestamps: true }), 'admins');

const InfrastructureManager = mongoose.model('InfrastructureManager', new mongoose.Schema({
  ...baseUserFields,
  department: { type: String, default: 'General Infrastructure' }
}, { timestamps: true }), 'infrastructure_managers');

const Technician = mongoose.model('Technician', new mongoose.Schema({
  ...baseUserFields,
  specialization: { type: String, default: 'General Maintenance' },
  fcmToken: { type: String, default: '' }
}, { timestamps: true }), 'technicians');

const User = mongoose.model('User', new mongoose.Schema({
  ...baseUserFields,
  phoneNumber: { type: String, default: '' },
  fcmToken: { type: String, default: '' }
}, { timestamps: true }), 'users');

module.exports = { Admin, InfrastructureManager, Technician, User };