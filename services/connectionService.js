import User from '../models/User.js';
import Connection from '../models/Connection.js';

export const createConnection = async (requesterId, recipientId) => {
  if (requesterId === recipientId) throw new Error("You can't connect with yourself");

  const existing = await Connection.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId }
    ]
  });
  if (existing) throw new Error('Connection already exists');

  const connection = await Connection.create({
    requester: requesterId,
    recipient: recipientId,
    status: 'pending'
  });

  return { message: 'Connection request sent', connection };
};

export const fetchPendingConnections = async (userId) => {
  const connections = await Connection.find({
    recipient: userId,
    status: 'pending'
  }).populate('requester', 'username email skills bio');

  return { connections };
};

export const approveConnection = async (userId, connectionId) => {
  const connection = await Connection.findOne({
    _id: connectionId,
    recipient: userId,
    status: 'pending'
  });
  if (!connection) throw new Error('Connection not found');

  connection.status = 'accepted';
  await connection.save();

  // Increment totalConnections for both users
  await User.findByIdAndUpdate(connection.requester, { $inc: { totalConnections: 1 } });
  await User.findByIdAndUpdate(connection.recipient, { $inc: { totalConnections: 1 } });

  return { message: 'Connection accepted', connection };
};

export const removeConnection = async (userId, connectionId) => {
  // Try to find a pending connection where the user is the recipient (decline request)
  let connection = await Connection.findOne({
    _id: connectionId,
    status: 'pending',
    recipient: userId
  });

  // If not found, try to find an accepted connection where the user is either party (remove connection)
  if (!connection) {
    connection = await Connection.findOne({
      _id: connectionId,
      status: 'accepted',
      $or: [
        { requester: userId },
        { recipient: userId }
      ]
    });
  }

  if (!connection) throw new Error('Connection not found');

  // If the connection was accepted, decrement for both users
  if (connection.status === 'accepted') {
    await Promise.all([
      User.findByIdAndUpdate(connection.requester, { $inc: { totalConnections: -1 }, $max: { totalConnections: 0 } }),
      User.findByIdAndUpdate(connection.recipient, { $inc: { totalConnections: -1 }, $max: { totalConnections: 0 } }),
    ]);
  }



  await connection.deleteOne();

  return { message: 'Connection removed' };
};

export const fetchMatches = async (userId) => {
  const connections = await Connection.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: 'accepted',
  });

  const matches = await Promise.all(
    connections.map(async (conn) => {
      const matchedUserId =
        conn.requester.toString() === userId ? conn.recipient : conn.requester;
      const user = await User.findById(matchedUserId).select('-password');
      return {
        connectionId: conn._id,
        user,
      };
    })
  );

  return matches;
};
