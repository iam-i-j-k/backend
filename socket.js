import { Server } from 'socket.io';
import config from './config.js';
import Message from './models/Message.js';
import { 
  pubClient, 
  subClient, 
  connectRedis 
} from './utils/redisClient.js';
import Connection from './models/Connection.js';

const CHANNEL_PREFIX = 'chat';

// Initialize Socket.IO with CORS configuration
const io = new Server({
  cors: {
    origin: [process.env.FRONTEND_URL || config.corsOrigin],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Redis Publisher
export const publishMessage = async (userId, message) => {
  try {
    await pubClient.publish(`${CHANNEL_PREFIX}:${userId}`, JSON.stringify(message));
  } catch (err) {
    console.error('Redis publish error:', err);
    // Fallback to direct socket emit if Redis fails
    io.to(userId).emit('receiveMessage', message);
  }
};

// Redis Subscriber
const redisSubscriber = {
  channels: new Set(),

  async subscribe(channel) {
    if (!this.channels.has(channel)) {
      this.channels.add(channel);
      await subClient.subscribe(channel, (messageStr, channel) => {
        try {
          const userId = channel.split(':')[1];
          const message = JSON.parse(messageStr);
          io.to(userId).emit('receiveMessage', message);
        } catch (err) {
          console.error('Redis subscription error:', err);
        }
      });
    }
  },

  async unsubscribe(channel) {
    if (this.channels.has(channel)) {
      await subClient.unsubscribe(channel);
      this.channels.delete(channel);
    }
  }
};

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle connection request events
  socket.on('join-connection-rooms', (userId) => {
    // Join both sender and receiver rooms
    socket.join(`sender-${userId}`);
    socket.join(`receiver-${userId}`);
    console.log(`User ${userId} joined connection rooms`);

    // Subscribe to Redis channels
    redisSubscriber.subscribe(`${CHANNEL_PREFIX}:${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.userId) {
      redisSubscriber.unsubscribe(`${CHANNEL_PREFIX}:${socket.userId}`);
    }
  });

  // Handle new connection requests
  socket.on('send-connection-request', async (data) => {
    try {
      const { requesterId, recipientId } = data;

      // Prevent duplicate requests
      const existing = await Connection.findOne({
        requester: requesterId,
        recipient: recipientId,
        status: 'pending'
      });
      if (existing) {
        socket.emit('error', { message: 'Request already sent' });
        return;
      }

      // Create connection request
      const newRequest = await Connection.create({
        requester: requesterId,
        recipient: recipientId,
        status: 'pending'
      });

      // Emit to both requester and recipient
      io.to(`sender-${requesterId}`).emit('connection-request-sent', newRequest);
      io.to(`receiver-${recipientId}`).emit('new-connection-request', newRequest);

      console.log('Connection request sent successfully');
    } catch (error) {
      console.error('Error sending connection request:', error);
      socket.emit('error', { message: 'Failed to send connection request' });
    }
  });

  // Handle message sending
  socket.on('sendMessage', async ({ sender, recipient, text, file, ...rest }) => {
    if (!sender || !recipient || (!text?.trim() && !file)) return;

    try {
      // Create message in MongoDB
      const message = await Message.create({
        sender,
        recipient,
        text,
        file,
        ...rest,
        type: file ? "file" : "text"
      });

      // Emit to both sender and recipient
      io.to(`sender-${recipient}`).emit('receiveMessage', message);
      io.to(`receiver-${sender}`).emit('receiveMessage', message);

      // Publish to Redis for offline message delivery
      publishMessage(recipient, message);
      publishMessage(sender, message);

      console.log('Message sent successfully');
    } catch (err) {
      console.error('Error saving/sending message:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // --- Typing Indicator ---
  socket.on('typing', ({ to, from }) => {
    // Notify the recipient that the sender is typing
    io.to(`receiver-${to}`).emit('typing', { from });
  });
  socket.on('stopTyping', ({ to, from }) => {
    io.to(`receiver-${to}`).emit('stopTyping', { from });
  });

  // --- Delivered ---
  socket.on('markAsDelivered', async ({ userId, chatUserId }) => {
    // Mark all messages from chatUserId to userId as delivered
    await Message.updateMany(
      { sender: chatUserId, recipient: userId, delivered: false },
      { $set: { delivered: true } }
    );
    // Fetch updated messages
    const updatedMessages = await Message.find({
      sender: chatUserId,
      recipient: userId
    }).sort({ createdAt: 1 });
    // Emit to both users
    io.to(`receiver-${userId}`).emit('messagesDelivered', { updatedMessages });
    io.to(`receiver-${chatUserId}`).emit('messagesDelivered', { updatedMessages });
  });

  // --- Seen ---
  socket.on('markAsSeen', async ({ userId, chatUserId }) => {
    // Mark all messages from chatUserId to userId as seen
    await Message.updateMany(
      { sender: chatUserId, recipient: userId, seen: false },
      { $set: { seen: true } }
    );
    // Fetch updated messages
    const updatedMessages = await Message.find({
      sender: chatUserId,
      recipient: userId
    }).sort({ createdAt: 1 });
    // Emit to both users
    io.to(`receiver-${userId}`).emit('messagesSeen', { updatedMessages });
    io.to(`receiver-${chatUserId}`).emit('messagesSeen', { updatedMessages });
  });

  // --- Clear Chat ---
  socket.on('clearChat', async ({ userId, chatUserId }) => {
    try {
      await Message.deleteMany({
        $or: [
          { sender: userId, recipient: chatUserId },
          { sender: chatUserId, recipient: userId }
        ]
      });
      // Notify both users to clear their chat UI
      io.to(`sender-${userId}`).emit('chatCleared', { chatUserId, userId });
      io.to(`receiver-${chatUserId}`).emit('chatCleared', { chatUserId, userId });
    } catch (err) {
      console.error('Error clearing chat:', err);
      socket.emit('error', { message: 'Failed to clear chat' });
    }
  });
});

export default io;
