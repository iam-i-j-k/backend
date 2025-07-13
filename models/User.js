import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  skills: { type: [String], default: [] },
  bio: { type: String, default: '' },
  totalConnections: { type: Number, default: 0 },
  isVerified: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });



export default mongoose.model('User', userSchema);
