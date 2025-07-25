import cloudinary from '../utils/cloudinary.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { getIO } from '../sockets/io.js';

// File upload service
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'skillswap-chat',
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    res.json({
      url: result.secure_url,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
};

// Clear chat service
export const clearChat = async (req, res) => {
  try {
    const { chatUserId } = req.params;
    const userId = req.userId;

    await Message.deleteMany({
      $or: [
        { sender: userId, recipient: chatUserId },
        { sender: chatUserId, recipient: userId }
      ]
    });

    const io = getIO();
    io.to(`user-${userId}`).emit('chatCleared', { 
      chatUserId,
      clearedBy: userId 
    });
    io.to(`user-${chatUserId}`).emit('chatCleared', {
      chatUserId: userId,
      clearedBy: userId
    });

    res.json({ message: 'Chat cleared successfully' });
  } catch (err) {
    console.error('Error clearing chat:', err);
    res.status(500).json({ error: 'Failed to clear chat' });
  }
};

// Get chat messages service

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
    const recipient = await User.findById(chatUserId).select('username email skills');

    res.status(200).json({ messages, recipient });
  } catch (err) {
    console.error('❌ Failed to get chat messages:', err);
    next(err);
  }
};
