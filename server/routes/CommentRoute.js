import express from 'express';
import { addComment, getComments } from '../controllers/CommentController.js';

const router = express.Router();

router.post('/', addComment);
router.get('/:postId', getComments);

export default router;
