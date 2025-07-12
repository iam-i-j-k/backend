import { pubClient, subClient } from '../utils/redisClient.js';

const CHANNEL_PREFIX = 'chat';

export const publishMessage = async (userId, message, io) => {
  try {
    await pubClient.publish(`${CHANNEL_PREFIX}:${userId}`, JSON.stringify(message));
  } catch (err) {
    console.error('Redis publish error:', err);
    io.to(`sender-${userId}`).emit('receiveMessage', message);
    io.to(`receiver-${userId}`).emit('receiveMessage', message);
  }
};

export const redisSubscriber = {
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

export { CHANNEL_PREFIX };