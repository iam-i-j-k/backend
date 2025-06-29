import { createClient } from 'redis';
import config from '../config.js';

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

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis client connected');
});

redisClient.on('ready', () => {
  console.log('Redis client ready');
});

redisClient.on('end', () => {
  console.log('Redis client connection ended');
});

redisClient.on('reconnecting', () => {
  console.log('Redis client reconnecting');
});

// Connect client
redisClient.connect()
  .then(() => {
    console.log('Redis client initialized successfully');
    // Test connection
    redisClient.set('test_connection', 'success')
      .then(() => redisClient.get('test_connection'))
      .then(result => {
        console.log('Redis connection test:', result);
      })
      .catch(err => console.error('Redis test failed:', err));
  })
  .catch((err) => {
    console.error('Failed to initialize Redis client:', err);
    if (config.environment === 'development') {
      console.warn('Redis is not available. Chat features may be limited.');
    }
  });

export default redisClient;
