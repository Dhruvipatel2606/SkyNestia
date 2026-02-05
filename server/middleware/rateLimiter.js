import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';

// Rate limiter middleware
const limiter = rateLimit({
    // Use Redis as the store for rate limiting
    store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});

// Specific limiter for AI features (to protect Gemini RPM)
export const aiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 5, // 5 AI requests per minute per IP
    message: { message: "Too many AI requests. Please wait a minute." },
});

export default limiter;
