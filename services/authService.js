import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import User from '../models/User.js';
import { sendVerificationEmail } from '../mailService.js';

export const registerService = async ({ username, email, password, skills, bio }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('Email already registered');
  }

  const user = new User({
    username,
    email,
    password, // assume hashing middleware is in model
    skills,
    bio,
    isVerified: false,
  });

  await user.save();

  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  await sendVerificationEmail(user.email, token);

  return {
    message: 'User registered. Verification email sent.',
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      skills: user.skills,
      bio: user.bio,
    }
  };
};

export const verifyEmailService = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) return { success: false, message: 'User not found' };
    if (user.isVerified) return { alreadyVerified: true };

    user.isVerified = true;
    await user.save();

    return { success: true };
  } catch (err) {
    return { success: false, message: 'Invalid or expired token' };
  }
};


export const loginService = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error('Invalid credentials');
  }
  if (!user.isVerified) {
    throw new Error('Please verify your email before logging in.');
  }
  const token = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: '24h' });
  return {
    token,
    user: { _id: user._id, username: user.username, email: user.email, skills: user.skills, bio: user.bio, verified: user.verified }
  };
};

export const updateProfileService = async (userId, data) => {
  const user = await User.findByIdAndUpdate(userId, data, { new: true });
  if (!user) throw new Error('User not found');
  return {
    user: { _id: user._id, username: user.username, email: user.email, bio: user.bio, skills: user.skills }
  };
};
