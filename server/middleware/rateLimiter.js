import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';

// Create rate limiter - RedisStore will use the client after it's connected
// The sendCommand is called lazily (per-request), not at construction time for rate checks.
// But RedisStore's constructor calls loadIncrementScript which uses sendCommand.
// So we must defer construction until Redis is connected, or use a wrapper.

const createLimiter = () => {
    const options = {
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests from this IP, please try again later.',
    };

    if (redisClient.isReady) {
        options.store = new RedisStore({
            sendCommand: (...args) => redisClient.sendCommand(args),
        });
        console.log('[RateLimiter] Using Redis store');
    } else {
        console.warn('[RateLimiter] Redis not ready, using in-memory store');
    }

    return rateLimit(options);
};

// Lazy middleware - creates the limiter on first request (by then Redis should be connected)
let _limiter = null;
const limiter = (req, res, next) => {
    if (!_limiter) {
        _limiter = createLimiter();
    }
    return _limiter(req, res, next);
};

// Specific limiter for AI features (to protect Gemini RPM)
export const aiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    message: { message: "Too many AI requests. Please wait a minute." },
});

export default limiter;
