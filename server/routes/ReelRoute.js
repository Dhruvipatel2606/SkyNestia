import express from 'express';
import { createReel, getReels, getUserReels, likeReel, commentReel, getReelById, incrementViews, upload } from '../controllers/ReelController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, upload.single('media'), createReel);
router.get('/', authMiddleware, getReels);
router.get('/user/:userId', authMiddleware, getUserReels);
router.get('/:id', authMiddleware, getReelById);
router.put('/:id/like', authMiddleware, likeReel);
router.post('/:id/comment', authMiddleware, commentReel);
router.put('/:id/view', authMiddleware, incrementViews);

export default router;
