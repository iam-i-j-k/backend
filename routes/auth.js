const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Connection = require('../models/Connection'); // Assuming you have a Connection model
const { io } = require('../index'); // Import the io instance

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

router.get('/users', auth, async (req, res) => {
  try {
    const loggedInUserId = req.user.userId;
    const users = await User.find({ _id: { $ne: loggedInUserId } }).select('-password'); // Excludes password field and logged-in user
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error); // Log the error details
    res.status(500).json({ error: 'Error fetching users', details: error.message });
  }
});

// Handle connection requests
router.post('/connections', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    const loggedInUserId = req.user.userId;

    // Check if the connection already exists
    const existingConnection = await Connection.findOne({
      $or: [
        { requester: loggedInUserId, recipient: userId },
        { requester: userId, recipient: loggedInUserId }
      ]
    });

    if (existingConnection) {
      return res.status(400).json({ error: 'Connection already exists' });
    }

    // Create a new connection
    const connection = new Connection({
      requester: loggedInUserId,
      recipient: userId,
      status: 'pending' // or 'connected' based on your logic
    });

    await connection.save();

    // Emit a Socket.io event to notify the recipient
    io.to(userId).emit('connectionRequest', {
      requester: loggedInUserId,
      connection
    });

    res.status(201).json({ message: 'Connection request sent', connection });
  } catch (error) {
    res.status(500).json({ error: 'Error creating connection', details: error.message });
  }
});

router.put('/connections/:id/accept', auth, async (req, res) => {
  try {
    const connectionId = req.params.id;
    const connection = await Connection.findById(connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    if (connection.recipient.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    connection.status = 'connected';
    await connection.save();

    res.json({ message: 'Connection accepted', connection });
  } catch (error) {
    res.status(500).json({ error: 'Error accepting connection', details: error.message });
  }
});

router.put('/connections/:id/reject', auth, async (req, res) => {
  try {
    const connectionId = req.params.id;
    const connection = await Connection.findById(connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    if (connection.recipient.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await connection.remove();

    res.json({ message: 'Connection rejected' });
  } catch (error) {
    res.status(500).json({ error: 'Error rejecting connection', details: error.message });
  }
});

module.exports = router;
