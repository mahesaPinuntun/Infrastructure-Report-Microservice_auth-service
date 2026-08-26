const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['CITIZEN', 'TECHNICIAN', 'MANAGER', 'ADMIN'], 
    default: 'CITIZEN' 
  },
  phone: { type: String },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

module.exports = {
  User
};
