import express from 'express';
import { createHighlight, getUserHighlights, updateHighlight, deleteHighlight } from '../controllers/HighlightController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, createHighlight);
router.get('/:userId', authMiddleware, getUserHighlights);
router.put('/:highlightId', authMiddleware, updateHighlight);
router.delete('/:highlightId', authMiddleware, deleteHighlight);

export default router;
