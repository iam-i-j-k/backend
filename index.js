const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);
const cors = require("cors");

const allowedOrigins = process.env.NODE_ENV === "production" 
  ? [process.env.FRONTEND_URL, "https://skillswap2.vercel.app"]
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"], // Allow required methods
    credentials: true, // Allow cookies & authentication headers
  })
);

// Middleware
app.use(express.json());
app.use('/api/auth', authRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
      });
      
// Socket.IO Configuration
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});
app.options("*", cors()); // Handle preflight requests for all routes

// Active users storage
const users = new Map();

// Socket.IO Connection Handler
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Register user
  socket.on("register", (userId) => {
    if (!userId) return;
    users.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ID ${socket.id}`);
  });

  // Handle messaging
  socket.on("sendMessage", async ({ senderId, receiverId, text }) => {
    try {
        if (!senderId || !receiverId || !text) {
            throw new Error('Invalid message data');
        }

        const receiverSocketId = users.get(receiverId);
        
        // Create and save message
        const message = new Message({
            sender: senderId,
            receiver: receiverId,
            text: text
        });
        await message.save();

        // Emit to both sender and receiver
        const messageData = {
            senderId,
            receiverId,
            text,
            _id: message._id,
            createdAt: message.createdAt
        };

        // Send to receiver if online
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("message", messageData);
        }
        
        // Send back to sender
        socket.emit("message", messageData);
        
    } catch (error) {
        console.error('Message handling error:', error);
        socket.emit("messageError", { error: "Failed to send message" });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    const userId = Array.from(users.entries())
      .find(([_, socketId]) => socketId === socket.id)?.[0];
    
    if (userId) {
      users.delete(userId);
      console.log(`User disconnected: ${userId} (${socket.id})`);
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`https://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    mongoose.connection.close();
    console.log('Server shutdown complete');
  });
});
