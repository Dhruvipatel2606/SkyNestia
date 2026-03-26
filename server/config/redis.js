import { createClient } from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                console.error('Redis: Max reconnection attempts reached.');
                return new Error('Max retries reached');
            }
            const delay = Math.min(retries * 200, 3000);
            console.log(`Redis: Reconnecting in ${delay}ms (attempt ${retries})...`);
            return delay;
        }
    }
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err.message));
redisClient.on('connect', () => console.log('Redis: Connecting...'));
redisClient.on('ready', () => console.log('✅ Redis: Connected and ready'));
redisClient.on('reconnecting', () => console.log('Redis: Reconnecting...'));
redisClient.on('end', () => console.log('Redis: Connection closed'));

// Connect Redis and export the promise so other modules can await it
const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (err) {
        console.warn('Redis connection failed:', err.message);
    }
};

const disconnectRedis = async () => {
    try {
        if (redisClient.isOpen) {
            await redisClient.disconnect();
            console.log('Redis client disconnected');
        }
    } catch (err) {
        console.error('Redis disconnection error:', err);
    }
};

export { redisClient, connectRedis, disconnectRedis };