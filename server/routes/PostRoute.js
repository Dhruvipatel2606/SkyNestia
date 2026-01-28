import express from 'express';
import { createPost, deletePost, getPost, getFeed, likePost, updatePost, getPendingTagPosts, toggleTagStatus, getUserPosts, upload } from '../controllers/PostController.js';

import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, upload.fields([{ name: 'images', maxCount: 5 }, { name: 'music', maxCount: 1 }]), createPost);
router.get('/:id', getPost);
router.get('/user/:id', getUserPosts);
router.put('/:id', updatePost);

router.delete('/:id', deletePost);
router.put('/:id/like', likePost);
router.get('/tags/pending', authMiddleware, getPendingTagPosts);
router.put('/:id/tag', authMiddleware, toggleTagStatus);
router.get('/user/:userId/feed', authMiddleware, getFeed);

export default router;