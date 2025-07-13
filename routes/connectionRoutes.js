import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  sendConnectionRequest,
  getPendingConnections,
  acceptConnectionRequest,
  declineConnectionRequest,
  getMatches,
  getConnectionStatus,
  removeConnection
} from '../controllers/connectionController.js';

const router = express.Router();

router.post('/', auth, sendConnectionRequest);
router.get('/', auth, getPendingConnections);
router.put('/:id/accept', auth, acceptConnectionRequest);
router.put('/:id/decline', auth, declineConnectionRequest); // For pending requests
router.delete('/:id', auth, removeConnection); // For accepted connections
router.get('/matches', auth, getMatches);
router.get('/status/:userId', auth, getConnectionStatus);

export default router;
