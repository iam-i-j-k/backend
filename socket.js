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

// Redis Publisher
export const publishMessage = async (userId, message, io) => {
  try {
    await pubClient.publish(`${CHANNEL_PREFIX}:${userId}`, JSON.stringify(message));
  } catch (err) {
    console.error('Redis publish error:', err);
io.to(`sender-${userId}`).emit('receiveMessage', message);
io.to(`receiver-${userId}`).emit('receiveMessage', message);
  }
};

// Redis Subscriber
const redisSubscriber = {
  channels: new Set(),

  async subscribe(channel, io) {
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

export default function(io) {
  io.on('connection', (socket) => {

    // Handle connection request events
    socket.on('join-connection-rooms', (userId) => {
      socket.userId = userId;
      // Join both sender and receiver rooms
      socket.join(`sender-${userId}`);
      socket.join(`receiver-${userId}`);

      // Subscribe to Redis channels
      redisSubscriber.subscribe(`${CHANNEL_PREFIX}:${userId}`, io);
    });

    socket.on('disconnect', () => {
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

        io.to(`sender-${recipient}`).emit('receiveMessage', message);
        io.to(`receiver-${sender}`).emit('receiveMessage', message);

        // Publish to Redis for offline message delivery
        publishMessage(recipient, message, io);

      } catch (err) {
        console.error('Error saving/sending message:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // --- Delete Message ---
    socket.on('deleteMessage', async ({ messageId }) => {
      try {
        const deleted = await Message.findByIdAndDelete(messageId);
        if (deleted) {
          io.to(`sender-${deleted.sender}`).emit('messageDeleted', { messageId });
          io.to(`receiver-${deleted.recipient}`).emit('messageDeleted', { messageId });
        }
      } catch (err) {
        console.error('Error deleting message:', err);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    socket.on('editMessage', async ({ messageId, userId, newText }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }
        if (message.sender.toString() !== userId) {
          socket.emit('error', { message: 'Not authorized to edit this message' });
          return;
        }
        message.text = newText;
        await message.save();
        // Emit the full updated message
        io.to(`sender-${message.sender}`).emit('messageEdited', { message });
        io.to(`receiver-${message.recipient}`).emit('messageEdited', { message });
      } catch (err) {
        console.error('Error editing message:', err);
        socket.emit('error', { message: 'Failed to edit message' });
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

    // --- React to Message ---
socket.on('reactMessage', async ({ messageId, userId, emoji }) => {
  try {
    const message = await Message.findById(messageId);
    if (!message) return;
    message.reactions = message.reactions || [];
    message.reactions.push({ user: userId, emoji });
    await message.save();
    io.to(`sender-${message.sender}`).emit('messageReacted', { messageId, userId, emoji });
    io.to(`receiver-${message.recipient}`).emit('messageReacted', { messageId, userId, emoji });
  } catch (err) {
    console.error('Error reacting to message:', err);
  }
});
  });
}
