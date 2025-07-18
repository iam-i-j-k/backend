import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  uploadFile,
  clearChat,
  getChatMessages
} from '../services/chatService.js';
import { upload } from '../utils/multerConfig.js';

const router = express.Router();

// File upload endpoint
router.post('/upload', auth, upload.single('file'), uploadFile);

// Clear chat endpoint
router.delete('/clear/:chatUserId', auth, clearChat);

// Get chat history
router.get('/history/:id', auth, getChatMessages);

export default router;