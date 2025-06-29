// models/Message.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String },
  file: {
    url: String,
    originalName: String,
    mimetype: String,
    size: Number
  },
  delivered: { type: Boolean, default: false },
  seen: { type: Boolean, default: false },
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      emoji: String,
    }
  ]
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);
