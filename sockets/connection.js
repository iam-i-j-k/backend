import Connection from '../models/Connection.js';

export function handleConnectionEvents(socket, io) {
  socket.on('send-connection-request', async (data) => {
    try {
      const { requesterId, recipientId } = data;
      const existing = await Connection.findOne({
        requester: requesterId,
        recipient: recipientId,
        status: 'pending'
      });
      if (existing) {
        socket.emit('error', { message: 'Request already sent' });
        return;
      }
      const newRequest = await Connection.create({
        requester: requesterId,
        recipient: recipientId,
        status: 'pending'
      });
      io.to(`sender-${requesterId}`).emit('connection-request-sent', newRequest);
      io.to(`receiver-${recipientId}`).emit('new-connection-request', newRequest);
    } catch (error) {
      console.error('Error sending connection request:', error);
      socket.emit('error', { message: 'Failed to send connection request' });
    }
  });
}