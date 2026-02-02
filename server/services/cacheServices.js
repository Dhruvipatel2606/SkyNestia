import { redisClient } from "../config/redis.js";

// Get cache by key
export const getCache = async (key) => {
    try {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error getting cache:', error);
        return null;
    }
};

// Set cache with an expiration time (in seconds)
export const setCache = async (key, value, ttl = 300) => {
    try {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
    }
    catch (error) {
        console.error('Error setting cache:', error);
    }
};

// Delete cache by key
export const deleteCache = async (key) => {
    try {
        await redisClient.del(key);
    } catch (error) {
        console.error('Error deleting cache:', error);
    }
};