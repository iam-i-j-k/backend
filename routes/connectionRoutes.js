import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  sendConnectionRequest,
  getPendingConnections,
  acceptConnectionRequest,
  declineConnectionRequest,
  getMatches,
  getConnectionStatus
} from '../controllers/connectionController.js';

const router = express.Router();

router.post('/', auth, sendConnectionRequest);
router.get('/', auth, getPendingConnections);
router.put('/:id/accept', auth, acceptConnectionRequest);
router.put('/:id/decline', auth, declineConnectionRequest);
router.get('/matches', auth, getMatches);
router.get('/status/:userId', auth, getConnectionStatus);

export default router;
