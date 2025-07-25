import Message from '../models/Message.js';
import { publishMessage } from './redis.js';

export function handleMessageEvents(socket, io) {
  socket.on('sendMessage', async ({ sender, recipient, text, file, ...rest }) => {
    if (!sender || !recipient || (!text?.trim() && !file)) return;
    try {
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
      publishMessage(recipient, message, io);
    } catch (err) {
      console.error('Error saving/sending message:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

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
      io.to(`sender-${message.sender}`).emit('messageEdited', { message });
      io.to(`receiver-${message.recipient}`).emit('messageEdited', { message });
    } catch (err) {
      console.error('Error editing message:', err);
      socket.emit('error', { message: 'Failed to edit message' });
    }
  });

// Update message status handlers
socket.on('markAsDelivered', async ({ messageId, userId }) => {
  try {
    const message = await Message.findByIdAndUpdate(
      messageId,
      { delivered: true, deliveredAt: new Date() },
      { new: true }
    ).lean();
    
    if (message) {
      // Notify sender that their message was delivered
      io.to(`user-${message.sender}`).emit('messageStatusUpdate', {
        type: 'delivered',
        messageId,
        userId: message.recipient
      });
    }
  } catch (err) {
    console.error('Delivery update error:', err);
  }
});

socket.on('markAsSeen', async ({ messageId, userId }) => {
  try {
    const message = await Message.findByIdAndUpdate(
      messageId,
      { seen: true, seenAt: new Date() },
      { new: true }
    ).lean();
    
    if (message) {
      // Notify sender that their message was seen
      io.to(`user-${message.sender}`).emit('messageStatusUpdate', {
        type: 'seen',
        messageId,
        userId: message.recipient
      });
    }
  } catch (err) {
    console.error('Seen update error:', err);
  }
});

  socket.on('clearChat', async ({ userId, chatUserId }) => {
    try {
      // Delete messages between both users
      await Message.deleteMany({
        $or: [
          { sender: userId, recipient: chatUserId },
          { sender: chatUserId, recipient: userId }
        ]
      });

      // Notify both users to clear their chat UI
      io.to(`user-${userId}`).emit('chatCleared', {
        chatUserId,
        userId
      });
      io.to(`user-${chatUserId}`).emit('chatCleared', {
        chatUserId: userId,
        userId
      });
    } catch (err) {
      console.error('Error clearing chat:', err);
      socket.emit('error', { message: 'Failed to clear chat' });
    }
  });

  // ... Add all other message-related events (typing, delivered, seen, clearChat, reactMessage) here ...
}