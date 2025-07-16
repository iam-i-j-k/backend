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
      // Emit updated connected users to both users
      const updatedUsers1 = await Connection.find({
        $or: [
          { requester: request.requester._id, status: 'accepted' },
          { recipient: request.requester._id, status: 'accepted' }
        ]
      }).populate('requester').populate('recipient');
      const updatedUsers2 = await Connection.find({
        $or: [
          { requester: request.recipient._id, status: 'accepted' },
          { recipient: request.recipient._id, status: 'accepted' }
        ]
      }).populate('requester').populate('recipient');
      io.to(`sender-${request.requester._id}`).emit('connectedUsersUpdated', updatedUsers1);
      io.to(`receiver-${request.recipient._id}`).emit('connectedUsersUpdated', updatedUsers2);
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
      // Emit updated connected users to both users
      const updatedUsers1 = await Connection.find({
        $or: [
          { requester: request.requester._id, status: 'accepted' },
          { recipient: request.requester._id, status: 'accepted' }
        ]
      }).populate('requester').populate('recipient');
      const updatedUsers2 = await Connection.find({
        $or: [
          { requester: request.recipient._id, status: 'accepted' },
          { recipient: request.recipient._id, status: 'accepted' }
        ]
      }).populate('requester').populate('recipient');
      io.to(`sender-${request.requester._id}`).emit('connectedUsersUpdated', updatedUsers1);
      io.to(`receiver-${request.recipient._id}`).emit('connectedUsersUpdated', updatedUsers2);
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
      // Emit updated connected users to both users
      const updatedUsers1 = await Connection.find({
        $or: [
          { requester: userId1, status: 'accepted' },
          { recipient: userId1, status: 'accepted' }
        ]
      }).populate('requester').populate('recipient');
      const updatedUsers2 = await Connection.find({
        $or: [
          { requester: userId2, status: 'accepted' },
          { recipient: userId2, status: 'accepted' }
        ]
      }).populate('requester').populate('recipient');
      io.to(`sender-${userId1}`).emit('connectedUsersUpdated', updatedUsers1);
      io.to(`receiver-${userId2}`).emit('connectedUsersUpdated', updatedUsers2);
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
      // Emit updated connected users to both users
      const updatedUsers1 = await Connection.find({
        $or: [
          { requester: requesterId, status: 'accepted' },
          { recipient: requesterId, status: 'accepted' }
        ]
      }).populate('requester').populate('recipient');
      const updatedUsers2 = await Connection.find({
        $or: [
          { requester: recipientId, status: 'accepted' },
          { recipient: recipientId, status: 'accepted' }
        ]
      }).populate('requester').populate('recipient');
      io.to(`sender-${requesterId}`).emit('connectedUsersUpdated', updatedUsers1);
      io.to(`receiver-${recipientId}`).emit('connectedUsersUpdated', updatedUsers2);
    } catch (error) {
      console.error('Error sending connection request:', error);
      socket.emit('error', { message: 'Failed to send connection request' });
    }
  });

  socket.on('getConnectedUsers', async () => {
    try {
      const userId = socket.handshake.query.userId;
      const connectedUsers = await Connection.find({
        $or: [
          { requester: userId, status: 'accepted' },
          { recipient: userId, status: 'accepted' }
        ]
      }).populate('requester').populate('recipient');
      socket.emit('connectedUsers', connectedUsers);
    } catch (error) {
      console.error('Error getting connected users:', error);
      socket.emit('error', { message: 'Failed to get connected users' });
    }
  });
}