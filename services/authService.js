import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import User from '../models/User.js';

export const registerService = async ({ username, email, password, skills, bio }) => {
  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) throw new Error('User already exists');

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    skills,
    bio
  });

  const token = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: '24h' });

  return {
    token,
    user: { _id: user._id, username: user.username, email: user.email, skills: user.skills, bio: user.bio }
  };
};

export const loginService = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: '24h' });

  return {
    token,
    user: { _id: user._id, username: user.username, email: user.email, skills: user.skills, bio: user.bio }
  };
};

export const updateProfileService = async (userId, data) => {
  const user = await User.findByIdAndUpdate(userId, data, { new: true });
  if (!user) throw new Error('User not found');
  return {
    user: { _id: user._id, username: user.username, email: user.email, bio: user.bio, skills: user.skills }
  };
};
