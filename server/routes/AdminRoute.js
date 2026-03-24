import express from 'express';
import { getPendingVerifications, approveVerification, rejectVerification, getAdminStats, getAdminUsers, updateUserStatus, banUser, restrictUser } from '../controllers/UserController.js';
import { getAdminPosts, adminDeletePost, getReports, reviewReport, getAnalytics } from '../controllers/AdminController.js';
import adminMiddleware from '../middleware/adminMiddleware.js';

const router = express.Router();

// Dashboard Stats
router.get('/stats', adminMiddleware, getAdminStats);

// User Management
router.get('/users', adminMiddleware, getAdminUsers);
router.put('/users/:id/status', adminMiddleware, updateUserStatus);
router.put('/users/:id/ban', adminMiddleware, banUser);
router.put('/users/:id/restrict', adminMiddleware, restrictUser);

// Post Management
router.get('/posts', adminMiddleware, getAdminPosts);
router.delete('/posts/:id', adminMiddleware, adminDeletePost);

// Reports
router.get('/reports', adminMiddleware, getReports);
router.put('/reports/:id/review', adminMiddleware, reviewReport);

// Verification Routes
router.get('/verifications/pending', adminMiddleware, getPendingVerifications);
router.put('/verifications/:id/approve', adminMiddleware, approveVerification);
router.put('/verifications/:id/reject', adminMiddleware, rejectVerification);

// Analytics
router.get('/analytics', adminMiddleware, getAnalytics);

export default router;
