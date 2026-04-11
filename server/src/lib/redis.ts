import {Redis} from 'ioredis';

// Use the URL from your .env, or fallback to the Docker default
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl);

// Listeners for monitoring the connection
redis.on('connect', () => {
    console.log('Redis: Connected successfully');
});
redis.on('error', (err) => {
    console.error('Redis: Connection error', err);
});