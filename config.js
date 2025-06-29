import dotenv from 'dotenv';
dotenv.config();

const config = {
  port: process.env.PORT || 8000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  frontendUrl: process.env.FRONTEND_URL,
  redis: {
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD,
    host: process.env.REDIS_HOST || 'redis-12960.c232.us-east-1-2.ec2.redns.redis-cloud.com',
    port: parseInt(process.env.REDIS_PORT) || 12960
  },
  corsOrigin: process.env.NODE_ENV === "production" 
    ? [process.env.FRONTEND_URL, "https://skillswap2.vercel.app"]
    : ["http://localhost:5173"],
  environment: process.env.NODE_ENV || 'development'
};

export default config;