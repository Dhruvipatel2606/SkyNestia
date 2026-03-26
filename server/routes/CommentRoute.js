import express from 'express';
import { addComment, getComments, deleteComment, toggleCommentLike } from '../controllers/CommentController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, addComment);
router.get('/:postId', getComments);
router.delete('/:commentId', authMiddleware, deleteComment);
router.put('/:commentId/like', authMiddleware, toggleCommentLike);

export default router;
