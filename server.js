import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import config from './config.js';
import io from './socket.js'; // ✅ Correctly import the modular Socket.IO instance
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/chat', chatRoutes);

// Error Handler
app.use(errorHandler);

// MongoDB Connection
mongoose.connect(config.mongoUri)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Attach Socket.IO to server
io.attach(server);

// Start Server
server.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
});
