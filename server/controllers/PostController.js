import { checkPostBehaviorSync, generateAICaptionBackground } from "../utils/geminiModeration.js";
import postModel from "../models/postModel.js";
import userModel from "../models/userModel.js";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { redisClient } from '../config/redis.js';

// Helper to delete files if validation fails
const cleanupFiles = (files) => {
    if (!files) return;
    files.forEach(file => {
        fs.unlink(file.path, (err) => {
            if (err) console.error(`Failed to delete file: ${file.path}`, err);
        });
    });
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'music') {
            cb(null, "public/audio");
        } else {
            cb(null, "public/images");
        }
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    },
});

export const upload = multer({ storage: storage });

export const createPost = async (req, res) => {
    try {
        const { description, tags, location, visibility } = req.body;
        const userId = req.userId;

        const imageFiles = req.files && req.files['images'] ? req.files['images'] : [];
        const musicFiles = req.files && req.files['music'] ? req.files['music'] : [];

        const hasImages = imageFiles.length > 0;
        const hasDescription = description && description.trim().length > 0;
        const hasMusic = musicFiles.length > 0 || (req.body.musicUrl && req.body.musicUrl.trim().length > 0);

        if (!hasImages && !hasDescription && !hasMusic) {
            return res.status(400).json({ message: 'Post must have a description, image, or music.' });
        }

        const imagePaths = imageFiles.map(file => `/images/${file.filename}`);
        let musicPath = "";

        if (musicFiles.length > 0) {
            musicPath = `/audio/${musicFiles[0].filename}`;
        } else if (req.body.musicUrl) {
            musicPath = req.body.musicUrl;
        }

        let processedTags = [];
        if (tags) {
            try {
                const tagsData = typeof tags === 'string' ? JSON.parse(tags) : tags;
                if (Array.isArray(tagsData)) {
                    processedTags = tagsData.map(tagId => ({ userId: tagId, status: 'pending' }));
                }
            } catch (e) {
                console.error("Error parsing tags", e);
            }
        }

        // Synchronous Behavior Check via Queue
        const safetyResult = await checkPostBehaviorSync(userId, description, imagePaths);

        if (safetyResult.action === 'REJECT') {
            cleanupFiles([...imageFiles, ...musicFiles]);
            return res.status(403).json({
                message: "Post behavior check failed.",
                isVulnerable: true,
                violationDetails: safetyResult.details
            });
        }

        const post = await postModel.create({
            userId: userId,
            caption: description,
            tags: processedTags,
            location,
            visibility,
            image: imagePaths[0] || "",
            images: imagePaths,
            music: musicPath,
            isModerated: true,
            isSafe: true,
            behaviorAudit: {
                category: safetyResult.details.category,
                reasoning: safetyResult.details.reasoning_brief,
                confidence: safetyResult.details.confidence_score,
                timestamp: new Date()
            }
        });

        res.status(201).json({ message: "Post created successfully", post });

        try {
            const keys = await redisClient.keys('feed:*');
            if (keys.length > 0) await redisClient.del(keys);
        } catch (err) { console.error('Redis cache error:', err); }

    } catch (error) {
        console.error("Create Post Error:", error);
        const imageFiles = req.files && req.files['images'] ? req.files['images'] : [];
        const musicFiles = req.files && req.files['music'] ? req.files['music'] : [];
        cleanupFiles([...imageFiles, ...musicFiles]);
        res.status(500).json({ message: "Post creation failed", error: error.message });
    }
};

export const generateCaption = async (req, res) => {
    try {
        const { image, mimeType, prompt } = req.body;
        const userId = req.userId;

        // Trigger background generation
        await generateAICaptionBackground(userId, image, mimeType, prompt);

        res.status(202).json({ message: "AI is thinking... your caption will appear shortly." });
    } catch (error) {
        console.error("AI Caption Queue Error:", error);
        res.status(500).json({ message: "AI generation failed to start", error: error.message });
    }
};

export const getPost = async (req, res) => {
    const id = req.params.id;
    try {
        const post = await postModel.findById(id).populate('userId', 'username profilePicture');
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving post', error: error.message });
    }
};

export const updatePost = async (req, res) => {
    const postId = req.params.id;
    const userId = req.userId;
    try {
        const post = await postModel.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.userId.toString() !== userId) {
            return res.status(403).json({ message: 'You can only update your own posts' });
        }

        // Behavior check on update synchronously
        if (req.body.caption || req.body.description) {
            const safetyResult = await checkPostBehaviorSync(userId, req.body.description || req.body.caption);
            if (safetyResult.action === 'REJECT') {
                return res.status(403).json({
                    message: "Vulnerable content detected in update.",
                    isVulnerable: true,
                    violationDetails: safetyResult.details
                });
            }
            // Add behavior audit to update
            req.body.isModerated = true;
            req.body.isSafe = true;
            req.body.behaviorAudit = {
                category: safetyResult.details.category,
                reasoning: safetyResult.details.reasoning_brief,
                confidence: safetyResult.details.confidence_score,
                timestamp: new Date()
            };
        }

        await postModel.findByIdAndUpdate(postId, { $set: req.body });
        res.status(200).json({ message: 'Post updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating post', error: error.message });
    }
};

export const deletePost = async (req, res) => {
    const postId = req.params.id;
    const userId = req.userId;
    try {
        const post = await postModel.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (post.userId.toString() === userId) {
            await postModel.findByIdAndDelete(postId);
            try {
                const keys = await redisClient.keys('feed:*');
                if (keys.length > 0) await redisClient.del(keys);
            } catch (err) { console.error('Redis cache error:', err); }
            res.status(200).json({ message: 'Post deleted successfully' });
        } else {
            res.status(403).json({ message: 'You can only delete your own posts' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error deleting post', error: error.message });
    }
};

export const likePost = async (req, res) => {
    const postId = req.params.id;
    const userId = req.userId;
    try {
        const post = await postModel.findById(postId);
        if (!post.likes.includes(userId)) {
            await post.updateOne({ $push: { likes: userId } });

            // Create notification if liking someone else's post
            if (post.userId.toString() !== userId) {
                const NotificationModel = (await import("../models/NotificationModel.js")).default;
                await NotificationModel.create({
                    recipientId: post.userId,
                    senderId: userId,
                    type: 'like',
                    postId: postId
                });
            }

            res.status(200).json({ message: 'Post liked' });
        } else {
            await post.updateOne({ $pull: { likes: userId } });
            res.status(200).json({ message: 'Post unliked' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error liking/unliking post', error: error.message });
    }
};

export const getPendingTagPosts = async (req, res) => {
    try {
        const posts = await postModel.find({
            "tags": { $elemMatch: { userId: req.userId, status: 'pending' } }
        }).populate('userId', 'username profilePicture');
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const toggleTagStatus = async (req, res) => {
    const postId = req.params.id;
    const { status } = req.body;
    const userId = req.userId;
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }
    try {
        const post = await postModel.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        const tagIndex = post.tags.findIndex(t => t.userId.toString() === userId);
        if (tagIndex === -1) {
            return res.status(404).json({ message: 'Tag request not found for this user' });
        }
        post.tags[tagIndex].status = status;
        if (status === 'rejected') {
            post.tags.splice(tagIndex, 1);
        }
        await post.save();
        res.status(200).json({ message: `Tag ${status}` });
    } catch (error) {
        res.status(500).json({ message: 'Error updating tag status', error: error.message });
    }
};

export const getUserPosts = async (req, res) => {
    const userId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    try {
        const posts = await postModel.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'username profilePicture firstname lastname')
            .populate('tags.userId', 'username firstname lastname');
        const totalPosts = await postModel.countDocuments({ userId });
        const hasMore = skip + posts.length < totalPosts;
        res.status(200).json({ posts, hasMore, totalPosts });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user posts', error: error.message });
    }
};

export const getFeed = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const cacheKey = `feed:${page}:${limit}`;

        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                return res.status(200).json(JSON.parse(cachedData));
            }
        } catch (err) { console.warn('Redis cache error:', err); }

        const currentUser = await userModel.findById(req.userId);
        const followingIds = currentUser ? currentUser.following.map(id => id.toString()) : [];

        // Query: 
        // 1. Post is Public OR
        // 2. Post is mine OR
        // 3. Post is 'followers' AND I follow the author
        const query = {
            $or: [
                { visibility: 'public' },
                { userId: req.userId }, // My posts
                {
                    visibility: 'followers',
                    userId: { $in: followingIds }
                }
            ]
        };

        const posts = await postModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'username profilePicture firstname lastname')
            .populate('tags.userId', 'username firstname lastname');

        const totalPosts = await postModel.countDocuments(query);
        const hasMore = skip + posts.length < totalPosts;

        const responseData = {
            feed: posts,
            currentPage: page,
            totalPages: Math.ceil(totalPosts / limit),
            hasMore
        };

        try {
            await redisClient.set(cacheKey, JSON.stringify(responseData), { EX: 3600 });
        } catch (err) { console.warn('Redis set error:', err); }

        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feed', error: error.message });
    }
};

export const toggleSavePost = async (req, res) => {
    const postId = req.params.id;
    const userId = req.userId;
    try {
        const user = await userModel.findById(userId);
        const isSaved = user.savedPosts.some(id => id.toString() === postId);
        if (isSaved) {
            await user.updateOne({ $pull: { savedPosts: postId } });
            res.status(200).json({ message: 'Post unsaved', saved: false });
        } else {
            await user.updateOne({ $addToSet: { savedPosts: postId } });
            res.status(200).json({ message: 'Post saved', saved: true });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error saving/unsaving post', error: error.message });
    }
};

export const getSavedPosts = async (req, res) => {
    const userId = req.userId;
    try {
        const user = await userModel.findById(userId).populate({
            path: 'savedPosts',
            populate: { path: 'userId', select: 'username profilePicture' }
        });
        const savedPosts = user.savedPosts.filter(p => p !== null);
        res.status(200).json(savedPosts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching saved posts', error: error.message });
    }
};
