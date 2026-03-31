import UserModel from '../models/userModel.js';

/**
 * Daily Screen Time Reset Job
 * Runs every day at midnight (00:00) using setInterval instead of node-cron
 * to avoid needing an extra dependency.
 * 
 * Resets overrideToday flag for all users with screen time enabled.
 */

// Calculate milliseconds until next midnight
const getMsUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Next midnight
    return midnight.getTime() - now.getTime();
};

const runReset = async () => {
    try {
        console.log('[RESET JOB] Running daily screen time reset...');
        const result = await UserModel.updateMany(
            { 'screenTime.isEnabled': true },
            {
                $set: {
                    'screenTime.overrideToday': false,
                    'screenTime.lastResetDate': new Date()
                }
            }
        );
        console.log(`[RESET JOB] Screen time reset complete. ${result.modifiedCount} users reset.`);
    } catch (error) {
        console.error('[RESET JOB] Error resetting screen time:', error.message);
    }
};

const startScreenTimeResetJob = () => {
    // Schedule first run at next midnight, then every 24 hours after
    const msUntilMidnight = getMsUntilMidnight();
    console.log(`✅ Screen time reset job scheduled (next reset in ${Math.round(msUntilMidnight / 60000)} minutes)`);

    setTimeout(() => {
        runReset(); // Run at midnight
        // Then repeat every 24 hours
        setInterval(runReset, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
};

export default startScreenTimeResetJob;
