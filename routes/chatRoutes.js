import express from 'express';
import { getChatMessages } from '../controllers/chatController.js';
import { auth } from '../middleware/auth.js';
import multer from 'multer';
import cloudinary from '../utils/cloudinary.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 20
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf', 'text/plain',
      'application/javascript', 'application/json', 'text/markdown',
      'video/mp4', 'video/webm', 'video/ogg', 'video/x-matroska', // videos
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/zip', 'application/x-zip-compressed',
      'text/csv', 'application/csv',
      'application/vnd.rar', 'application/x-rar-compressed',
      'audio/mpeg', 'audio/ogg', 'audio/wav' // common audio formats
    ];
    

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  console.log('I am working');

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Wrap cloudinary stream upload in a Promise
    const uploadToCloudinary = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'skillswap-chat',
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true,
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

    const result = await uploadToCloudinary();

    res.json({
      url: result.secure_url,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

// Clear chat endpoint
router.delete('/clear/:chatUserId', auth, async (req, res) => {
  try {
    const { chatUserId } = req.params;
    const userId = req.userId;

    // Delete messages from database
    await Message.deleteMany({
      $or: [
        { sender: userId, recipient: chatUserId },
        { sender: chatUserId, recipient: userId }
      ]
    });

    // Emit clear chat event to other user
    io.to(chatUserId).emit('clearChat', { userId });

    res.json({ message: 'Chat cleared successfully' });
  } catch (err) {
    console.error('Error clearing chat:', err);
    res.status(500).json({ error: 'Failed to clear chat' });
  }
});

router.get('/history/:id', auth, getChatMessages);

export default router;
