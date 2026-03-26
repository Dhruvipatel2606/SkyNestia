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
        if (file && file.path) {
            fs.unlink(file.path, (err) => {
                if (err) console.error(`Failed to delete file: ${file.path}`, err);
            });
        }
    });
};

const extractHashtags = (text) => {
    if (!text) return [];
    const hashMatches = text.match(/#\w+/g);
    return hashMatches ? hashMatches.map(h => h.slice(1).toLowerCase()) : [];
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
        const { description, tags, location, visibility, status, scheduledDate } = req.body;
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
            
            const user = await userModel.findById(userId);
            if (user) {
                user.violationCount = (user.violationCount || 0) + 1;
                user.violationHistory.push({
                    category: safetyResult.details.category,
                    reasoning: safetyResult.details.reasoning_brief,
                    timestamp: new Date()
                });
                
                if (user.violationCount >= 3) {
                    user.restrictions.canPost = false;
                    user.restrictions.canComment = false;
                    user.restrictionReason = 'Auto-restricted due to repeated content violations.';
                    user.accountStatus = 'suspended';
                }
                await user.save();
            }

            return res.status(403).json({
                message: user && user.violationCount >= 3 ? "Account suspended due to repeated violations." : "Post behavior check failed.",
                isVulnerable: true,
                violationDetails: safetyResult.details,
                strikeCount: user ? user.violationCount : 1
            });
        }

        const post = await postModel.create({
            userId: userId,
            caption: description,
            hashtags: extractHashtags(description),
            tags: processedTags,
            location,
            visibility,
            image: imagePaths[0] || "",
            images: imagePaths,
            music: musicPath,
            status: status || 'published',
            scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
            isModerated: true,
            isSafe: true,
            behaviorAudit: {
                category: safetyResult.details.category,
                reasoning: safetyResult.details.reasoning_brief,
                confidence: safetyResult.details.confidence_score,
                timestamp: new Date()
            }
        });

        // Send Tag Notifications
        if (processedTags.length > 0) {
            const NotificationModel = (await import("../models/NotificationModel.js")).default;
            const notifications = processedTags.map(tag => ({
                recipientId: tag.userId,
                senderId: userId,
                type: 'tag_request',
                postId: post._id
            }));
            await NotificationModel.insertMany(notifications);
        }

        res.status(201).json({ message: "Post created successfully", post });

        if (redisClient.isReady) {
            try {
                const userKeys = await redisClient.keys(`feed:${userId}:*`);
                if (userKeys.length > 0) await redisClient.del(userKeys);
                console.log(`[Cache INVALIDATE] Cleared ${userKeys.length} feed keys for user ${userId}`);
                
                const poster = await userModel.findById(userId);
                if (poster && poster.followers.length > 0) {
                    for (const fid of poster.followers) {
                        const fKeys = await redisClient.keys(`feed:${fid}:*`);
                        if (fKeys.length > 0) await redisClient.del(fKeys);
                    }
                }
            } catch (err) { console.error('[Cache INVALIDATE Error]', err.message); }
        }

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
                const user = await userModel.findById(userId);
                if (user) {
                    user.violationCount = (user.violationCount || 0) + 1;
                    user.violationHistory.push({
                        category: safetyResult.details.category,
                        reasoning: safetyResult.details.reasoning_brief,
                        timestamp: new Date()
                    });
                    
                    if (user.violationCount >= 3) {
                        user.restrictions.canPost = false;
                        user.restrictions.canComment = false;
                        user.restrictionReason = 'Auto-restricted due to repeated content violations.';
                        user.accountStatus = 'suspended';
                    }
                    await user.save();
                }

                return res.status(403).json({
                    message: user && user.violationCount >= 3 ? "Account suspended due to repeated violations." : "Vulnerable content detected in update.",
                    isVulnerable: true,
                    violationDetails: safetyResult.details,
                    strikeCount: user ? user.violationCount : 1
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

        if (req.body.description || req.body.caption) {
            req.body.hashtags = extractHashtags(req.body.description || req.body.caption);
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
            if (redisClient.isReady) {
                try {
                    const userKeys = await redisClient.keys(`feed:${userId}:*`);
                    if (userKeys.length > 0) await redisClient.del(userKeys);
                    
                    const poster = await userModel.findById(userId);
                    if (poster && poster.followers.length > 0) {
                        for (const fid of poster.followers) {
                            const fKeys = await redisClient.keys(`feed:${fid}:*`);
                            if (fKeys.length > 0) await redisClient.del(fKeys);
                        }
                    }
                } catch (err) { console.error('[Cache INVALIDATE Error]', err.message); }
            }
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
    const userId = req.params.id; // Profile Owner
    const currentUserId = req.userId; // Viewer
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const user = await userModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Check Privacy
        // If profile is private AND I am not the owner AND I am not following
        const isOwner = currentUserId === userId;
        const isFollowing = user.followers.map(id => id.toString()).includes(currentUserId);

        if (!isOwner && !isFollowing) {
            // Not owner and Not following.
            // If user is private, we generally block, UNLESS they have public posts.
            // The user explicitly requested: "But the user had posted the post in public than other user can also see it."
            // So we construct a query to only fetch 'public' posts.
        }

        let query = { userId };
        if (!isOwner) {
            if (isFollowing) {
                // Follower: See Public and Followers
                // query.visibility = { $in: ['public', 'followers'] }; 
                // (Assuming default is public/followers if field missing, but good to be explicit if we have strict visibility)
            } else {
                // Non-Follower (Stranger)
                // Can ONLY see 'public' posts.
                // This applies to both Private and Public accounts based on user request.
                query.visibility = 'public';
            }
        }


        if (query.status === 'scheduled') {
             // Let's simplify and just do an $or at top level, but it overrides query object if not careful.
             // We can use $and.
        }
        
        // Actually, let's be concise:
        const finalQuery = {
            $and: [
                query,
                {
                    $or: [
                        { status: 'published' },
                        { status: { $exists: false } },
                        { status: 'scheduled', scheduledDate: { $lte: new Date() } }
                    ]
                }
            ]
        };

        // If it's a private account and the query returns NO posts, then the frontend can show the 'Private' lock.
        // But if it returns posts, the frontend should show them.
        // So we don't block here. We just filter.

        const posts = await postModel.find(finalQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'username profilePicture firstname lastname')
            .populate('tags.userId', 'username firstname lastname');
        const totalPosts = await postModel.countDocuments(finalQuery);
        const hasMore = skip + posts.length < totalPosts;
        res.status(200).json({ posts, hasMore, totalPosts, isPrivate: user.isPrivate });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user posts', error: error.message });
    }
};

export const getFeed = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const cacheKey = `feed:${req.userId}:${page}:${limit}`;

        if (redisClient.isReady) {
            try {
                const cachedData = await redisClient.get(cacheKey);
                if (cachedData) {
                    console.log(`[Cache HIT] ${cacheKey}`);
                    return res.status(200).json(JSON.parse(cachedData));
                }
                console.log(`[Cache MISS] ${cacheKey}`);
            } catch (err) { console.warn('[Cache GET Error]', err.message); }
        }

        const currentUser = await userModel.findById(req.userId);
        const followingIds = currentUser ? currentUser.following.map(id => id.toString()) : [];

        // Query: 
        // 1. Post is Public OR
        // 2. Post is mine OR
        // 3. Post is 'followers' AND I follow the author
        const query = {
            $and: [
                {
                    $or: [
                        { status: 'published' },
                        { status: { $exists: false } },
                        { status: 'scheduled', scheduledDate: { $lte: new Date() } }
                    ]
                },
                {
                    $or: [
                        { visibility: 'public' },
                        { userId: req.userId }, // My posts
                        { visibility: 'followers', userId: { $in: followingIds } }
                    ]
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

        if (redisClient.isReady) {
            try {
                await redisClient.set(cacheKey, JSON.stringify(responseData), { EX: 3600 });
                console.log(`[Cache SET] ${cacheKey} (TTL: 3600s)`);
            } catch (err) { console.warn('[Cache SET Error]', err.message); }
        }

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

export const getDrafts = async (req, res) => {
    try {
        const posts = await postModel.find({ userId: req.userId, status: 'draft' }).sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ message: "Error", error: err.message });
    }
};

export const getScheduled = async (req, res) => {
    try {
        const posts = await postModel.find({ userId: req.userId, status: 'scheduled', scheduledDate: { $gt: new Date() } }).sort({ scheduledDate: 1 });
        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ message: "Error", error: err.message });
    }
};

// Search & Discovery Features
export const searchPosts = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(200).json([]);

        const isHashtag = query.startsWith('#');
        const searchTerm = isHashtag ? query.slice(1) : query;

        const posts = await postModel.find({
            $and: [
                { visibility: 'public' },
                {
                    $or: [
                        { hashtags: searchTerm.toLowerCase() },
                        { caption: { $regex: searchTerm, $options: "i" } }
                    ]
                }
            ]
        }).populate('userId', 'username profilePicture');

        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getTrendingPosts = async (req, res) => {
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const posts = await postModel.aggregate([
            { $match: { createdAt: { $gte: oneWeekAgo }, visibility: 'public' } },
            { $addFields: { score: { $add: [{ $size: "$likes" }, { $multiply: [{ $size: "$comments" }, 2] }] } } },
            { $sort: { score: -1 } },
            { $limit: 20 },
            { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
            { $unwind: '$user' },
            { $project: { 'user.password': 0, 'user.email': 0 } }
        ]);

        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getExploreFeed = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await userModel.findById(userId);
        const following = user.following || [];

        // Fetch posts from non-following users
        const posts = await postModel.find({
            userId: { $nin: [...following, userId] },
            visibility: 'public'
        })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate('userId', 'username profilePicture');

        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
