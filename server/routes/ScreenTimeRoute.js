import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
    getScreenTime,
    updateScreenTimeSettings,
    startSession,
    pingSession,
    endSession,
    overrideScreenTime
} from '../controllers/ScreenTimeController.js';

const router = express.Router();

// Get screen time settings + today's usage
router.get('/', authMiddleware, getScreenTime);

// Update screen time settings (limit, enable/disable, reset time)
router.put('/settings', authMiddleware, updateScreenTimeSettings);

// Session management
router.post('/session/start', authMiddleware, startSession);
router.post('/session/ping', authMiddleware, pingSession);
router.post('/session/end', authMiddleware, endSession);

// Override ("Continue for today")
router.post('/override', authMiddleware, overrideScreenTime);

export default router;
