import User from '../models/User.js';

export const fetchAllUsers = async (excludeUserId) => {
  const users = await User.find({ _id: { $ne: excludeUserId } }).select('-password');
  return { users };
};