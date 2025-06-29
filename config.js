import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: process.env.PORT || 8000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  frontendUrl: process.env.FRONTEND_URL,
  redis: {
    url: process.env.REDIS_URL || `redis://${process.env.REDIS_USERNAME}:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:12960`
  },
  corsOrigin: process.env.NODE_ENV === "production" 
    ? process.env.FRONTEND_URL
    : ["http://localhost:5173"],
  environment: process.env.NODE_ENV || 'development'
};

export default config;