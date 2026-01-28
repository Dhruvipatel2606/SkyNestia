import { createClient } from 'redis';

//user to connect to redis
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
    try {
        await redisClient.connect();
        console.log('Redis client connected');
    } catch (err) {
        console.warn('Redis connection failed (Cache and Rate Limiting will be disabled):', err.message);
    }
})();

//user to disconnect from redis
const disconnectRedis = async () => {
    try {
        await redisClient.disconnect();
        console.log('Redis client disconnected');
    } catch (err) {
        console.error('Redis disconnection error:', err);
    }
};

export { redisClient, disconnectRedis };