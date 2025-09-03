import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import connectionRoutes from './routes/connectionRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import config from './config.js';
import { Server } from 'socket.io';
import http from 'http';
import { errorHandler } from './middleware/errorHandler.js';
import sockets from './sockets/index.js'; 

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middlewares
const allowedOrigins = [];
if (process.env.NODE_ENV === 'production') {
  allowedOrigins.push(process.env.FRONTEND_URL);
}else{
  allowedOrigins.push('http://localhost:5173');
}

app.use(cors({
  origin: [
    ...allowedOrigins
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to the SkillSwap API');
})

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/chat', chatRoutes);

// Error Handler
app.use(errorHandler);


// Initialize Socket.IO with production configuration
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8,
  httpCompression: true,
  cookie: false
});

// Pass io to socketHandlers to register all events
sockets(io);

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
