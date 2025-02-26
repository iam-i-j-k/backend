// routes/messages.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get messages for a room
router.get('/:roomId', auth, async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.roomId })
      .populate('sender', 'username')
      .populate('receiver', 'username')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Error fetching messages' });
  }
});

// Create new message
router.post('/', 
  auth, 
  [
    body('senderId').notEmpty().withMessage('Sender ID is required'),
    body('receiverId').notEmpty().withMessage('Receiver ID is required'),
    body('text').notEmpty().withMessage('Message text is required'),
    body('roomId').notEmpty().withMessage('Room ID is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    console.log("Incoming request body:", req.body); // Debugging

    const message = new Message({
      sender: req.body.senderId,
      receiver: req.body.receiverId,
      text: req.body.text,
      roomId: req.body.roomId
    });

    try {
      const savedMessage = await message.save();
      const populatedMessage = await Message.findById(savedMessage._id)
        .populate('sender', 'username')
        .populate('receiver', 'username');
  
      res.status(201).json(populatedMessage);
    } catch (error) {
      console.error("Error saving message:", error);
      res.status(500).json({ error: "Error saving message", details: error.message });
    }
  });
  
module.exports = router;
