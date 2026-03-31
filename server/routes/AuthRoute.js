import express from 'express';
import {
    registerUser,
    loginUser,
    googleAuth,
    refreshAccessToken,
    logoutUser,
    setup2FA,
    verify2FA,
    resend2FAOTP,
    forgotPassword,
    verifyOTP,
    resetPassword,
    getSessions,
    revokeSession,
    logoutAllDevices
} from '../controllers/AuthController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', (req, res) => res.send('Auth Route is working'));

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);

// Protected Auth Routes
router.post('/2fa/setup', authMiddleware, setup2FA);
router.post('/2fa/verify', authMiddleware, verify2FA);
router.post('/2fa/resend', authMiddleware, resend2FAOTP);

// Password Reset Routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// Session Management
router.get('/sessions', authMiddleware, getSessions);
router.delete('/sessions/:sessionId', authMiddleware, revokeSession);
router.post('/logout-all', authMiddleware, logoutAllDevices);

export default router; 