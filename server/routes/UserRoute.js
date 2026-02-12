import express from 'express';
import { getUserProfile, updateUserProfile, deleteUserProfile, followUser, unfollowUser, searchUser, suggestedUsers, getFollowers, getFollowing, getMutualFollowers, getFollowRequests, acceptFollowRequest, rejectFollowRequest } from '../controllers/UserController.js';
import { upload } from '../controllers/PostController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import UserModel from '../models/userModel.js';
import { redisClient } from '../config/redis.js';

const router = express.Router();

// More specific routes first (with /profile/cache prefix)
// If not found in cache, fetch from DB and store in cache
router.get('/profile/cache/:id', async (req, res) => {
    const userId = req.params.id;
    const cacheKey = `userProfile:${userId}`;
    try {
        // Check Redis cache first
        const cachedProfile = await redisClient.get(cacheKey);
        if (cachedProfile) {
            return res.status(200).json({ source: 'cache', profile: JSON.parse(cachedProfile) });
        }

        // If not in cache, fetch from database
        const userProfile = await UserModel.findById(userId).select('-password');
        if (!userProfile) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Store the fetched profile in Redis cache with an expiration time (e.g., 1 hour)
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(userProfile));

        // Return the user profile
        return res.json({ source: 'database', profile: userProfile });
    }
    catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Invalidate cache on profile update or delete
router.put('/profile/cache/:id', async (req, res) => {
    const userId = req.params.id;
    const cacheKey = `userProfile:${userId}`;
    try {
        await redisClient.del(cacheKey);
        return res.status(200).json({ message: 'Cache invalidated' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Specific GET routes MUST be defined before /:id
router.get('/search', authMiddleware, searchUser); // search user
router.get("/suggested/users", authMiddleware, suggestedUsers); // suggested users
router.get("/followers/:id", getFollowers);
router.get("/following/:id", getFollowing);
router.get("/mutual/:id", authMiddleware, getMutualFollowers);

// Follow Requests
router.get('/requests/pending', authMiddleware, getFollowRequests);
router.put('/requests/:id/accept', authMiddleware, acceptFollowRequest);
router.put('/requests/:id/reject', authMiddleware, rejectFollowRequest);

// Generic routes
router.get('/:id', authMiddleware, getUserProfile); // get user profile - Wildcard matching
router.put('/update/:id', authMiddleware, upload.fields([{ name: 'profileImage', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), updateUserProfile); // update user profile
router.delete('/:id', authMiddleware, deleteUserProfile); // delete user profile
router.put('/:id/follow', authMiddleware, followUser); // follow user
router.put('/:id/unfollow', authMiddleware, unfollowUser); // unfollow user

export default router;