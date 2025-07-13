import {
  createConnection,
  fetchPendingConnections,
  approveConnection,
  fetchMatches
} from '../services/connectionService.js';
import Connection from '../models/Connection.js'; // Import the Connection model
import { getIO } from '../sockets/io.js';

export const sendConnectionRequest = async (req, res, next) => {
  try {
    const { userId: requesterId } = req;
    const { userId: recipientId } = req.body;
    const { connection } = await createConnection(requesterId, recipientId);

    // Emit to both users
    const io = getIO();
    io.to(`sender-${requesterId}`).emit('connectionRequestSent', connection);
    io.to(`receiver-${recipientId}`).emit('newConnectionRequest', connection);

    res.status(201).json({ message: 'Connection request sent', connection });
  } catch (err) {
    next(err);
  }
};

export const getPendingConnections = async (req, res, next) => {
  try {
    const result = await fetchPendingConnections(req.userId);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error in getPendingConnections:', err); // Add this line
    next(err);
  }
};

export const acceptConnectionRequest = async (req, res, next) => {
  try {
    const { userId } = req;
    const { id: connectionId } = req.params;
    const { connection } = await approveConnection(userId, connectionId);

    // Emit to both users
    const io = getIO();
    io.to(`sender-${connection.requester}`).emit('connectionAccepted', connection);
    io.to(`receiver-${connection.recipient}`).emit('connectionAccepted', connection);

    res.json({ message: 'Connection accepted', connection });
  } catch (err) {
    next(err);
  }
};

export const declineConnectionRequest = async (req, res, next) => {
  try {
    const { userId } = req;
    const { id: connectionId } = req.params;
    // Only decline if pending and recipient is current user
    const connection = await Connection.findOneAndUpdate(
      { _id: connectionId, recipient: userId, status: 'pending' },
      { status: 'declined' },
      { new: true }
    );
    if (!connection) return res.status(404).json({ error: "Pending connection not found" });

    const io = getIO();
    io.to(`sender-${connection.requester}`).emit('connectionDeclined', { connectionId });
    io.to(`receiver-${connection.recipient}`).emit('connectionDeclined', { connectionId });

    res.json({ message: 'Connection declined', connectionId });
  } catch (err) {
    next(err);
  }
};

export const getMatches = async (req, res, next) => {
  try {
    const matches = await fetchMatches(req.userId);
    res.status(200).json({ matches });
  } catch (err) {
    next(err);
  }
};

export const getConnectionStatus = async (req, res, next) => {
  try {
    const userId = req.userId; // logged-in user
    const otherUserId = req.params.userId;

    // Find any connection between the two users
    const connection = await Connection.findOne({
      $or: [
        { requester: userId, recipient: otherUserId },
        { requester: otherUserId, recipient: userId }
      ]
    });

    let status = "none";
    if (connection) {
      if (connection.status === "accepted") {
        status = "connected";
      } else if (connection.status === "pending") {
        status = "pending";
      }
    }

    res.json({ status });
  } catch (err) {
    next(err);
  }
};

export const removeConnection = async (req, res, next) => {
  try {
    const { userId } = req;
    const { id: connectionId } = req.params;
    // Only remove if accepted and user is part of connection
    const connection = await Connection.findOneAndDelete({
      _id: connectionId,
      status: 'accepted',
      $or: [{ requester: userId }, { recipient: userId }]
    });
    if (!connection) return res.status(404).json({ error: "Accepted connection not found" });

    const io = getIO();
    io.to(`sender-${connection.requester}`).emit('connectionRemoved', { connectionId });
    io.to(`receiver-${connection.recipient}`).emit('connectionRemoved', { connectionId });

    res.json({ message: 'Connection removed', connectionId });
  } catch (err) {
    next(err);
  }
};
