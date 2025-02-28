const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const auth = async (req, res, next) => {
  if (!req.header('Authorization')) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error); // Log the error for debugging
    res.status(401).json({ error: 'Authentication required' });
  }
};

module.exports = auth;

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, skills, bio } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [
        { email },
        { username }
      ]
    });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      skills,
      bio
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        skills: user.skills,
        bio: user.bio
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyValue)[0];
      const message = `The ${field} is already in use.`;
      return res.status(400).json({ error: message });
    }
    console.error('Registration error:', error); // Log the error details
    res.status(500).json({ error: 'Error registering user', details: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        skills: user.skills,
        bio: user.bio
      }
    });
  } catch (error) {
    console.error('Login error:', error); // Log the error details
    res.status(500).json({ error: 'Error logging in', details: error.message });
  }
});

// Update Profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { username, bio, skills } = req.body;
    const userId = req.user.userId;

    // Find user by ID and update profile
    const user = await User.findByIdAndUpdate(
      userId,
      { username, bio, skills },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        skills: user.skills
      }
    });
  } catch (error) {
    console.error('Profile update error:', error); // Log the error details
    res.status(500).json({ error: 'Error updating profile', details: error.message });
  }
});

// Fetch Users
router.get('/users', async (req, res) => {
  try {
    const loggedInUserEmail = req.user.email; // Get logged-in user email from authentication middleware

    const users = await User.find({ email: { $ne: loggedInUserEmail } }) // Exclude the logged-in user
      .select('-password'); // Excludes password field

    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Error fetching users', details: error.message });
  }
});

module.exports = router;