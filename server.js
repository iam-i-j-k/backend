import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { connectRedis } from './utils/redisClient.js';
import config from './config.js';
import io from './socket.js';
import http from 'http';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors({
  origin: config.corsOrigin,
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

// Initialize Redis connection
connectRedis()
  .then(() => {
    console.log('✅ Redis initialized successfully');
  })
  .catch((err) => {
    console.error('❌ Redis initialization failed:', err);
    if (config.environment === 'development') {
      console.warn('Redis is not available. Chat features may be limited.');
    }
  });

// Initialize Socket.IO
io.attach(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// MongoDB Connection
mongoose.connect(config.mongoUri)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    server.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });
