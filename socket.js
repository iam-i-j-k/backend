import { Server } from 'socket.io';
import { createClient } from 'redis';
import config from './config.js';
import Message from './models/Message.js';

const CHANNEL_PREFIX = 'chat';

// Initialize Redis clients
const pub = createClient({ url: config.redisUrl });
const sub = createClient({ url: config.redisUrl });

let pubConnected = false;
let subConnected = false;

// Connect both Redis clients once on file load
if (!pubConnected) {
  await pub.connect();
  pubConnected = true;
}
if (!subConnected) {
  await sub.connect();
  subConnected = true;
}

// Initialize Socket.IO
const io = new Server({
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  }
});

// Redis Publisher
export const publishMessage = async (userId, message) => {
  try {
    await pub.pPublish(`${CHANNEL_PREFIX}:${userId}`, JSON.stringify(message));
  } catch (err) {
    console.error('❌ Redis publish error:', err);
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
      await sub.pSubscribe(channel, (messageStr, channel) => {
        try {
          const userId = channel.split(':')[1];
          const message = JSON.parse(messageStr);
          io.to(userId).emit('receiveMessage', message);
        } catch (err) {
          console.error('❌ Redis subscription error:', err);
        }
      });
    }
  }

  async unsubscribe(channel) {
    if (this.channels.has(channel)) {
      await sub.pUnsubscribe(channel);
      this.channels.delete(channel);
    }
  }
}

const redisSubscriber = new RedisSubscriber();

// Socket.IO Event Handlers
io.on('connection', (socket) => {
  console.log('⚡ User connected:', socket.id);

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
      await pub.publish(`${CHANNEL_PREFIX}:${recipient}`, JSON.stringify(messageData));
      await pub.publish(`${CHANNEL_PREFIX}:${sender}`, JSON.stringify(messageData));
    } catch (err) {
      console.error('❌ Error saving/sending message:', err);
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
    console.log('⚡ User disconnected:', socket.id);
    if (socket.userId) {
      redisSubscriber.unsubscribe(`${CHANNEL_PREFIX}:${socket.userId}`);
    }
  });

  socket.on("receiveMessage", (message) => {
    setMessages((prev) => [...prev, message])
    if (message.sender === chatUserId) {
      socket.emit("markAsDelivered", {
        userId: currentUser._id,
        chatUserId: message.sender,
      })
    }
  })
});

export default io;
