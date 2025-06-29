import { Server } from 'socket.io';
import config from './config.js';
import Message from './models/Message.js';
import redisClient from './utils/redisClient.js';
import { connectRedis } from './utils/redisClient.js';

const CHANNEL_PREFIX = 'chat';

// Initialize Socket.IO with CORS configuration
const io = new Server({
  cors: {
    origin: config.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Redis Publisher
export const publishMessage = async (userId, message) => {
  try {
    await connectRedis();
    await redisClient.publish(`${CHANNEL_PREFIX}:${userId}`, JSON.stringify(message));
  } catch (err) {
    console.error('Redis publish error:', err);
    // Fallback to direct socket emit if Redis fails
    io.to(userId).emit('receiveMessage', message);
  }
};

// Redis Subscriber Class
class RedisSubscriber {
  constructor() {
    this.channels = new Set();
  }

  async subscribe(channel) {
    if (!this.channels.has(channel)) {
      this.channels.add(channel);
      await redisClient.subscribe(channel, (messageStr, channel) => {
        try {
          const userId = channel.split(':')[1];
          const message = JSON.parse(messageStr);
          io.to(userId).emit('receiveMessage', message);
        } catch (err) {
          console.error('Redis subscription error:', err);
        }
      });
    }
  }

  async unsubscribe(channel) {
    if (this.channels.has(channel)) {
      await redisClient.unsubscribe(channel);
      this.channels.delete(channel);
    }
  }
}

const redisSubscriber = new RedisSubscriber();

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle connection request events
  socket.on('join', (userId) => {
    socket.join(userId);
    socket.userId = userId;
    redisSubscriber.subscribe(`${CHANNEL_PREFIX}:${userId}`);
  });

  socket.on('messageReacted', ({ messageId, userId, emoji }) => {
    socket.to(userId).emit('messageReacted', { messageId, userId, emoji });
  });

  socket.on('typing', ({ to, from }) => {
    socket.to(to).emit('typing', { from });
  });

  socket.on('stopTyping', ({ to, from }) => {
    socket.to(to).emit('stopTyping', { from });
  });

  socket.on('markAsDelivered', async ({ userId, chatUserId }) => {
    await Message.updateMany(
      { sender: chatUserId, recipient: userId, delivered: false },
      { $set: { delivered: true } }
    );
    // Fetch updated messages from chatUserId to userId
    const updatedMessages = await Message.find({
      sender: chatUserId,
      recipient: userId
    }).sort({ createdAt: 1 });
    // Emit to both users
    io.to(userId).emit('messagesDelivered', { updatedMessages });
    io.to(chatUserId).emit('messagesDelivered', { updatedMessages });
  });

  socket.on('markAsSeen', async ({ userId, chatUserId }) => {
    await Message.updateMany(
      { sender: chatUserId, recipient: userId, seen: false },
      { $set: { seen: true } }
    );
    // Fetch updated messages from chatUserId to userId
    const updatedMessages = await Message.find({
      sender: chatUserId,
      recipient: userId
    }).sort({ createdAt: 1 });
    // Emit to both users
    io.to(userId).emit('messagesSeen', { updatedMessages });
    io.to(chatUserId).emit('messagesSeen', { updatedMessages });
  });

  socket.on('clearChat', ({ userId, chatUserId }) => {
    socket.to(chatUserId).emit('chatCleared', { userId });
  });

  socket.on('sendMessage', async ({ sender, recipient, text, file, ...rest }) => {
    if (!sender || !recipient || (!text?.trim() && !file)) return;

    try {
      // Save the message to MongoDB
      const savedMessage = await Message.create({
        sender,
        recipient,
        text,
        file, // file: { url, originalName, mimetype, size }
        ...rest
      });

      // Prepare the message object to emit
      const messageData = {
        _id: savedMessage._id,
        sender,
        recipient,
        text,
        file: savedMessage.file,
        createdAt: savedMessage.createdAt,
        updatedAt: savedMessage.updatedAt,
        delivered: savedMessage.delivered,
        seen: savedMessage.seen,
        reactions: savedMessage.reactions,
        type: file ? "file" : "text"
      };

      // Publish to Redis for both users (sender and recipient)
      await publishMessage(recipient, messageData);
      await publishMessage(sender, messageData);
    } catch (err) {
      console.error('Error saving/sending message:', err);
    }
  });

  socket.on('deleteMessage', async ({ messageId, userId }) => {
    const msg = await Message.findById(messageId);
    if (msg && msg.sender.toString() === userId) {
      await msg.deleteOne();
      io.to(msg.sender.toString()).emit('messageDeleted', { messageId });
      io.to(msg.recipient.toString()).emit('messageDeleted', { messageId });
    }
  });

  socket.on('editMessage', async ({ messageId, userId, newText }) => {
    const msg = await Message.findById(messageId);
    if (msg && msg.sender.toString() === userId) {
      msg.text = newText;
      await msg.save();
      io.to(msg.sender.toString()).emit('messageEdited', { messageId, newText });
      io.to(msg.recipient.toString()).emit('messageEdited', { messageId, newText });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.userId) {
      redisSubscriber.unsubscribe(`${CHANNEL_PREFIX}:${socket.userId}`);
    }
  });
});

export default io;
