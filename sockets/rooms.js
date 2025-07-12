import { redisSubscriber, CHANNEL_PREFIX } from './redis.js';

export function handleJoinRooms(socket, io) {
  socket.on('join-connection-rooms', (userId) => {
    socket.userId = userId;
    socket.join(`sender-${userId}`);
    socket.join(`receiver-${userId}`);
    redisSubscriber.subscribe(`${CHANNEL_PREFIX}:${userId}`, io);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      redisSubscriber.unsubscribe(`${CHANNEL_PREFIX}:${socket.userId}`);
    }
  });
}