// utils/redisClient.js
import { createClient } from 'redis';

const redisClient = createClient({
    url: 'redis://localhost:6379' // change if using remote Redis
});

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

await redisClient.connect(); // Only works with top-level await (Node 18+)

export default redisClient;
