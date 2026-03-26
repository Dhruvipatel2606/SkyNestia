import { redisClient } from "../config/redis.js";

const isReady = () => redisClient.isOpen && redisClient.isReady;

// Get cache by key
export const getCache = async (key) => {
    if (!isReady()) return null;
    try {
        const data = await redisClient.get(key);
        if (data) console.log(`[Cache HIT] ${key}`);
        else console.log(`[Cache MISS] ${key}`);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('[Cache GET Error]', key, error.message);
        return null;
    }
};

// Set cache with an expiration time (in seconds)
export const setCache = async (key, value, ttl = 300) => {
    if (!isReady()) return;
    try {
        await redisClient.set(key, JSON.stringify(value), { EX: ttl });
        console.log(`[Cache SET] ${key} (TTL: ${ttl}s)`);
    }
    catch (error) {
        console.error('[Cache SET Error]', key, error.message);
    }
};

// Delete cache by key
export const deleteCache = async (key) => {
    if (!isReady()) return;
    try {
        await redisClient.del(key);
        console.log(`[Cache DEL] ${key}`);
    } catch (error) {
        console.error('[Cache DEL Error]', key, error.message);
    }
};