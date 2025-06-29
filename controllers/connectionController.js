import {
  createConnection,
  fetchPendingConnections,
  approveConnection,
  removeConnection,
  fetchMatches
} from '../services/connectionService.js';
import Connection from '../models/Connection.js'; // Import the Connection model

export const sendConnectionRequest = async (req, res, next) => {
  try {
    const result = await createConnection(req.userId, req.body.userId);

    // Populate requester before emitting
    const populatedConnection = await Connection.findById(result.connection._id)
      .populate('requester', 'username email skills bio');

    const io = req.app.get('io');
    if (io && populatedConnection) {
      io.emit('connectionRequestSent', populatedConnection);
    }

    res.status(201).json(result);
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
    const result = await approveConnection(req.userId, req.params.id);

    // Emit event for accepted connection (populated)
    const io = req.app.get('io');
    if (io && result.connection) {
      const populatedConnection = await Connection.findById(result.connection._id)
        .populate('requester', 'username email skills bio')
        .populate('recipient', 'username email skills bio');
      io.emit('connectionAccepted', populatedConnection);
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const declineConnectionRequest = async (req, res, next) => {
  try {
    const result = await removeConnection(req.userId, req.params.id);

    // Emit event for declined/removed connection
    const io = req.app.get('io');
    if (io) {
      io.emit('connectionDeclined', { connectionId: req.params.id, remover: req.userId });
    }

    res.status(200).json(result);
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
