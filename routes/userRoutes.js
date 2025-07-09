import express from 'express';
import { auth } from '../middleware/auth.js';
import { getAllUsers, getUserById, getUserStats } from '../controllers/userController.js';

const router = express.Router();

router.get('/', auth, getAllUsers);
router.get('/:id', auth, getUserById);
router.get('/stats', auth, getUserStats);

export default router;