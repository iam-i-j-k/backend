import Message from '../models/Message.js';
import User from '../models/User.js';
import { fetchAllUsers } from '../services/userService.js';

export const getAllUsers = async (req, res, next) => {
  try {
    const result = await fetchAllUsers(req.userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

export const getUserStats = async (req, res) => {
  const userId = req.userId;
  const user = await User.findById(userId);

  // Total accepted connections
  const totalConnections = user.totalConnections;

  // Messages sent
  const messagesSent = await Message.countDocuments({ sender: userId });

  // Video calls (dummy, unless you have a model for this)
  const videoCalls = 0;

  // Scheduled calls (dummy, unless you have a model for this)
  const scheduledCalls = 0;

  res.json({
    totalConnections,
    messagesSent,
    videoCalls,
    scheduledCalls,
  });
};