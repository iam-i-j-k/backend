import { createClient } from 'redis';
import config from '../config.js';

// Create separate clients for publishing and subscribing
export const pubClient = createClient({
  url: config.redis.url,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 5
});

export const subClient = createClient({
  url: config.redis.url,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 5
});

// Connection state tracking
let pubConnected = false;
let subConnected = false;

// Error handling
const handleError = (client, label) => (err) => {
  console.error(`${label} Redis Client Error:`, err);
  console.error(`${label} Redis URL:`, config.redis.url);
};

// Connect clients with error handling
export const connectRedis = async () => {
  if (!pubConnected) {
    try {
      await pubClient.connect();
      pubConnected = true;
      console.log('✅ Pub Redis client connected');
    } catch (err) {
      console.error('❌ Pub Redis connection failed:', err);
    }
  }

  if (!subConnected) {
    try {
      await subClient.connect();
      subConnected = true;
      console.log('✅ Sub Redis client connected');
    } catch (err) {
      console.error('❌ Sub Redis connection failed:', err);
    }
  }
};

// Initialize clients with error handling
pubClient.on('error', handleError(pubClient, 'Pub'));
subClient.on('error', handleError(subClient, 'Sub'));

pubClient.on('connect', () => console.log('Pub Redis client connected'));
subClient.on('connect', () => console.log('Sub Redis client connected'));

pubClient.on('ready', () => console.log('Pub Redis client ready'));
subClient.on('ready', () => console.log('Sub Redis client ready'));

pubClient.on('end', () => console.log('Pub Redis client connection ended'));
subClient.on('end', () => console.log('Sub Redis client connection ended'));

subClient.on('reconnecting', () => console.log('Sub Redis client reconnecting'));

// Test connections
connectRedis()
  .then(() => {
    console.log('✅ Redis clients initialized successfully');
    // Optional: test connection
    Promise.all([
      pubClient.set('test_connection', 'success'),
      subClient.subscribe('test_channel')
    ]).then(() => {
      console.log('✅ Redis clients tested successfully');
    }).catch(err => {
      console.error('❌ Redis test failed:', err);
    });
  })
  .catch(err => {
    console.error('❌ Failed to initialize Redis clients:', err);
    if (config.environment === 'development') {
      console.warn('Redis is not available. Chat features may be limited.');
    }
  });
