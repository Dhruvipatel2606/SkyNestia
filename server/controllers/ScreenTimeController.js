import UserModel from '../models/userModel.js';
import { redisClient } from '../config/redis.js';

// Helper: Get today's date string in YYYY-MM-DD format
const getTodayStr = () => new Date().toISOString().split('T')[0];

// Helper: Calculate warning level from usage
const getWarningLevel = (usageSeconds, limitMinutes) => {
    if (!limitMinutes || limitMinutes <= 0) return null;
    const limitSeconds = limitMinutes * 60;
    const ratio = usageSeconds / limitSeconds;
    if (ratio >= 1.0) return 'blocked';
    if (ratio >= 0.9) return 'hard';
    if (ratio >= 0.8) return 'soft';
    return null;
};

// Helper: Safely check if Redis is available
const isRedisReady = () => {
    try {
        return redisClient && redisClient.isOpen;
    } catch {
        return false;
    }
};

// GET /api/screentime — Fetch user's screen time settings and today's usage
export const getScreenTime = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId).select('screenTime appUsage');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const today = getTodayStr();
        const todayRecord = user.appUsage?.find(u => u.date === today);
        const usageTodaySeconds = todayRecord ? todayRecord.timeSpent : 0;

        const limitMinutes = user.screenTime?.dailyLimitMinutes || 0;
        const isEnabled = user.screenTime?.isEnabled || false;

        res.status(200).json({
            isEnabled,
            dailyLimitMinutes: limitMinutes,
            resetTime: user.screenTime?.resetTime || '00:00',
            usageTodaySeconds,
            warningLevel: isEnabled ? getWarningLevel(usageTodaySeconds, limitMinutes) : null,
            overrideToday: user.screenTime?.overrideToday || false
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching screen time', error: error.message });
    }
};

// PUT /api/screentime/settings — Update daily limit settings
export const updateScreenTimeSettings = async (req, res) => {
    try {
        const { dailyLimitMinutes, isEnabled, resetTime } = req.body;

        const updateFields = {};
        if (dailyLimitMinutes !== undefined) {
            updateFields['screenTime.dailyLimitMinutes'] = Math.max(0, parseInt(dailyLimitMinutes) || 0);
        }
        if (isEnabled !== undefined) {
            updateFields['screenTime.isEnabled'] = Boolean(isEnabled);
        }
        if (resetTime !== undefined) {
            const match = String(resetTime).match(/^([01]\d|2[0-3]):([0-5]\d)$/);
            if (!match) {
                return res.status(400).json({ message: 'Invalid resetTime format. Use HH:MM (e.g., "00:00")' });
            }
            updateFields['screenTime.resetTime'] = resetTime;
        }

        // If disabling, also clear the override flag
        if (isEnabled === false) {
            updateFields['screenTime.overrideToday'] = false;
        }

        const user = await UserModel.findByIdAndUpdate(
            req.userId,
            { $set: updateFields },
            { new: true }
        ).select('screenTime');

        res.status(200).json({
            message: 'Screen time settings updated',
            screenTime: user.screenTime
        });
    } catch (error) {
        res.status(500).json({ message: 'Error updating screen time settings', error: error.message });
    }
};

// POST /api/screentime/session/start — Store session start in Redis
export const startSession = async (req, res) => {
    try {
        const userId = req.userId;

        // Try to use Redis if available, otherwise just return MongoDB data
        if (isRedisReady()) {
            const redisKey = `screentime:${userId}`;
            const existing = await redisClient.get(redisKey);
            if (!existing) {
                await redisClient.set(redisKey, JSON.stringify({
                    startedAt: Date.now(),
                    lastPingAt: Date.now()
                }));
                await redisClient.expire(redisKey, 86400);
            }
        }

        // Fetch current usage to return
        const user = await UserModel.findById(userId).select('screenTime appUsage');
        const today = getTodayStr();
        const todayRecord = user?.appUsage?.find(u => u.date === today);
        const usageTodaySeconds = todayRecord ? todayRecord.timeSpent : 0;
        const limitMinutes = user?.screenTime?.dailyLimitMinutes || 0;
        const isEnabled = user?.screenTime?.isEnabled || false;

        res.status(200).json({
            message: 'Session started',
            usageTodaySeconds,
            isEnabled,
            dailyLimitMinutes: limitMinutes,
            warningLevel: isEnabled ? getWarningLevel(usageTodaySeconds, limitMinutes) : null,
            overrideToday: user?.screenTime?.overrideToday || false
        });
    } catch (error) {
        res.status(500).json({ message: 'Error starting session', error: error.message });
    }
};

// POST /api/screentime/session/ping — Called every 60s from frontend
export const pingSession = async (req, res) => {
    try {
        const userId = req.userId;
        const today = getTodayStr();
        let elapsedSeconds = 60; // Default to 60s if Redis unavailable

        // Try to calculate precise elapsed time from Redis
        if (isRedisReady()) {
            const redisKey = `screentime:${userId}`;
            const sessionDataStr = await redisClient.get(redisKey);

            if (sessionDataStr) {
                const sessionData = JSON.parse(sessionDataStr);
                const now = Date.now();
                elapsedSeconds = Math.floor((now - sessionData.lastPingAt) / 1000);

                // Cap at 5 minutes to prevent stale session inflation
                elapsedSeconds = Math.min(elapsedSeconds, 300);

                // Update lastPingAt in Redis
                sessionData.lastPingAt = now;
                await redisClient.set(redisKey, JSON.stringify(sessionData));
                await redisClient.expire(redisKey, 86400);
            } else {
                // No session in Redis, create one
                await redisClient.set(redisKey, JSON.stringify({
                    startedAt: Date.now(),
                    lastPingAt: Date.now()
                }));
                await redisClient.expire(redisKey, 86400);
                elapsedSeconds = 0; // First ping, no time to add
            }
        }

        // Flush elapsed time to MongoDB appUsage
        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (elapsedSeconds > 0) {
            const existingUsage = user.appUsage.find(u => u.date === today);
            if (existingUsage) {
                existingUsage.timeSpent += elapsedSeconds;
            } else {
                user.appUsage.push({ date: today, timeSpent: elapsedSeconds });
            }
            await user.save();
        }

        // Calculate current state
        const updatedRecord = user.appUsage.find(u => u.date === today);
        const usageTodaySeconds = updatedRecord ? updatedRecord.timeSpent : 0;
        const limitMinutes = user.screenTime?.dailyLimitMinutes || 0;
        const isEnabled = user.screenTime?.isEnabled || false;

        res.status(200).json({
            usageTodaySeconds,
            dailyLimitMinutes: limitMinutes,
            isEnabled,
            warningLevel: isEnabled ? getWarningLevel(usageTodaySeconds, limitMinutes) : null,
            overrideToday: user.screenTime?.overrideToday || false
        });
    } catch (error) {
        res.status(500).json({ message: 'Error pinging session', error: error.message });
    }
};

// POST /api/screentime/session/end — Called on logout/tab close
export const endSession = async (req, res) => {
    try {
        const userId = req.userId;

        if (isRedisReady()) {
            const redisKey = `screentime:${userId}`;
            const sessionDataStr = await redisClient.get(redisKey);
            if (sessionDataStr) {
                const sessionData = JSON.parse(sessionDataStr);
                const now = Date.now();
                const elapsedSeconds = Math.min(
                    Math.floor((now - sessionData.lastPingAt) / 1000),
                    300 // Cap at 5 minutes
                );

                if (elapsedSeconds > 0) {
                    const today = getTodayStr();
                    const user = await UserModel.findById(userId);
                    if (user) {
                        const existingUsage = user.appUsage.find(u => u.date === today);
                        if (existingUsage) {
                            existingUsage.timeSpent += elapsedSeconds;
                        } else {
                            user.appUsage.push({ date: today, timeSpent: elapsedSeconds });
                        }
                        await user.save();
                    }
                }

                await redisClient.del(redisKey);
            }
        }

        res.status(200).json({ message: 'Session ended' });
    } catch (error) {
        res.status(500).json({ message: 'Error ending session', error: error.message });
    }
};

// POST /api/screentime/override — "Continue for today" button
export const overrideScreenTime = async (req, res) => {
    try {
        await UserModel.findByIdAndUpdate(req.userId, {
            $set: { 'screenTime.overrideToday': true }
        });

        res.status(200).json({ message: 'Screen time override enabled for today' });
    } catch (error) {
        res.status(500).json({ message: 'Error overriding screen time', error: error.message });
    }
};
