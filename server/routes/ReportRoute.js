import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import ReportModel from '../models/ReportModel.js';

const router = express.Router();

// Any user can file a report
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { targetType, targetId, reason, description } = req.body;

        if (!targetType || !targetId || !reason) {
            return res.status(400).json({ message: 'targetType, targetId, and reason are required' });
        }

        // Prevent duplicate reports
        const existing = await ReportModel.findOne({
            reporterId: req.userId,
            targetId,
            targetType,
            status: 'pending'
        });
        if (existing) {
            return res.status(400).json({ message: 'You have already reported this content' });
        }

        await ReportModel.create({
            reporterId: req.userId,
            targetType,
            targetId,
            reason,
            description: description || ''
        });

        res.status(201).json({ message: 'Report submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting report', error: error.message });
    }
});

export default router;
