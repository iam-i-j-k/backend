import Message from '../models/Message.js';
import User from '../models/User.js';

export const getChatMessages = async (req, res, next) => {
  try {
    const userId = req.userId;
    const chatUserId = req.params.id;

    // Validate input
    if (!chatUserId) return res.status(400).json({ error: 'Chat user ID is required' });

    // Get chat messages between the two users
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: chatUserId },
        { sender: chatUserId, recipient: userId }
      ]
    }).sort({ createdAt: 1 });

    // ✅ Fetch recipient basic info
    const recipient = await User.findById(chatUserId).select('username email');

    res.status(200).json({ messages, recipient });
  } catch (err) {
    console.error('❌ Failed to get chat messages:', err);
    next(err);
  }
};
