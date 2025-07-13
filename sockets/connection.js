import Connection from '../models/Connection.js';

export function handleConnectionEvents(socket, io) {


  socket.on('accept-connection-request', async ({ requestId }) => {
    try {
      const request = await Connection.findByIdAndUpdate(
        requestId,
        { status: 'accepted' },
        { new: true }
      ).populate('requester').populate('recipient');
      if (!request) {
        socket.emit('error', { message: 'Request not found' });
        return;
      }
      io.to(`sender-${request.requester._id}`).emit('connectionAccepted', request);
      io.to(`receiver-${request.recipient._id}`).emit('connectionAccepted', request);
    } catch (error) {
      console.error('Error accepting connection request:', error);
      socket.emit('error', { message: 'Failed to accept connection request' });
    }
  });

  // Decline connection request
  socket.on('decline-connection-request', async ({ requestId }) => {
    try {
      const request = await Connection.findByIdAndUpdate(
        requestId,
        { status: 'declined' },
        { new: true }
      ).populate('requester').populate('recipient');
      if (!request) {
        socket.emit('error', { message: 'Request not found' });
        return;
      }
      io.to(`sender-${request.requester._id}`).emit('connectionDeclined', request);
      io.to(`receiver-${request.recipient._id}`).emit('connectionDeclined', request);
    } catch (error) {
      console.error('Error declining connection request:', error);
      socket.emit('error', { message: 'Failed to decline connection request' });
    }
  });

  socket.on('remove-connection', async ({ connectionId, userId1, userId2 }) => {
  try {
    // Delete the connection from DB
    await Connection.findByIdAndDelete(connectionId);

    // Notify both users to update their UI
    io.to(`sender-${userId1}`).emit('connectionRemoved', { connectionId });
    io.to(`receiver-${userId2}`).emit('connectionRemoved', { connectionId });
  } catch (err) {
    console.error('Error removing connection:', err);
    socket.emit('error', { message: 'Failed to remove connection' });
  }
});


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
      io.to(`receiver-${recipientId}`).emit('newConnectionRequest', newRequest);
    } catch (error) {
      console.error('Error sending connection request:', error);
      socket.emit('error', { message: 'Failed to send connection request' });
    }
  });
}