const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  skills: {
    type: [String],
    default: [],
  },
  bio: {
    type: String,
    default: '',
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);