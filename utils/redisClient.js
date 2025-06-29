import { createClient } from 'redis';
import config from '../config.js';

let connected = false;

const redisClient = createClient({
  username: config.redis.username,
  password: config.redis.password,
  socket: {
    host: config.redis.host,
    port: config.redis.port
  },
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 5
});

// Logging
redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Redis client connected'));
redisClient.on('ready', () => console.log('Redis client ready'));
redisClient.on('end', () => console.log('Redis client connection ended'));
redisClient.on('reconnecting', () => console.log('Redis client reconnecting'));

// Lazy connect function
export const connectRedis = async () => {
  if (!connected) {
    try {
      await redisClient.connect();
      connected = true;
      console.log('✅ Redis client initialized successfully');

      // Optional: test connection
      const result = await redisClient.set('test_connection', 'success');
      if (result) {
        const val = await redisClient.get('test_connection');
        console.log('Redis connection test:', val);
      }
    } catch (err) {
      console.error('❌ Failed to initialize Redis client:', err);
      if (config.environment === 'development') {
        console.warn('Redis is not available. Chat features may be limited.');
      }
    }
  }
};

export default redisClient;
