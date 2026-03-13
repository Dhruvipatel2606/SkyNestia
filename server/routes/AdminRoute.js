import express from 'express';
import { getPendingVerifications, approveVerification, rejectVerification } from '../controllers/UserController.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

// Admin Verification Routes
router.get('/verifications/pending', adminMiddleware, getPendingVerifications);
router.put('/verifications/:id/approve', adminMiddleware, approveVerification);
router.put('/verifications/:id/reject', adminMiddleware, rejectVerification);

export default router;
