import express from 'express';
import { createStory, getStories, viewStory, reactToStory, deleteStory, toggleSaveStory, replyToStory, upload } from '../controllers/StoryController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, upload.single('media'), createStory);
router.get('/', authMiddleware, getStories);
router.put('/:storyId/view', authMiddleware, viewStory);
router.put('/:storyId/react', authMiddleware, reactToStory);
router.delete('/:storyId', authMiddleware, deleteStory);
router.post('/:storyId/save', authMiddleware, toggleSaveStory);
router.post('/:storyId/reply', authMiddleware, replyToStory);

export default router;
