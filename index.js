const express = require('express');
const http = require('http');
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    mongoose.connection.close();
    console.log('Server shutdown complete');
  });
});
