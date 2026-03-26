import express from 'express';
import { createPost, deletePost, getPost, getFeed, likePost, updatePost, getPendingTagPosts, toggleTagStatus, getUserPosts, upload, generateCaption, getSavedPosts, toggleSavePost, getDrafts, getScheduled, searchPosts, getTrendingPosts, getExploreFeed } from '../controllers/PostController.js';

import authMiddleware from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/generate-caption', authMiddleware, aiLimiter, generateCaption);
router.post('/', authMiddleware, aiLimiter, upload.fields([{ name: 'images', maxCount: 5 }, { name: 'music', maxCount: 1 }]), createPost);

router.get('/saved', authMiddleware, getSavedPosts); // Must be before /:id
router.get('/drafts', authMiddleware, getDrafts);
router.get('/scheduled', authMiddleware, getScheduled);
router.get('/search', authMiddleware, searchPosts);
router.get('/trending', authMiddleware, getTrendingPosts);
router.get('/explore', authMiddleware, getExploreFeed);
router.put('/:id/save', authMiddleware, toggleSavePost);

router.get('/:id', getPost);
router.get('/user/:id', getUserPosts);
router.put('/:id', authMiddleware, updatePost);

router.delete('/:id', authMiddleware, deletePost);
router.put('/:id/like', authMiddleware, likePost);
router.get('/tags/pending', authMiddleware, getPendingTagPosts);
router.put('/:id/tag', authMiddleware, toggleTagStatus);
router.get('/user/:userId/feed', authMiddleware, getFeed);

export default router;