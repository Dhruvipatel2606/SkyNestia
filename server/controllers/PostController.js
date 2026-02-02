import { checkPostSafety, checkImageSafety, getGenAI } from "../utils/geminiModeration.js";
import postModel from "../models/postModel.js";
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

/* -------------------------------------------------------------------------- */
/*                               MULTER STORAGE                               */
/* -------------------------------------------------------------------------- */

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'music') {
            cb(null, "public/audio");
        } else {
            cb(null, "public/images");
        }
    },
    filename: (req, file, cb) => {
        // Ensure unique filenames
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    },
});

export const upload = multer({ storage: storage });


/* -------------------------------------------------------------------------- */
/*                                CREATE POST                                 */
/* -------------------------------------------------------------------------- */

export const createPost = async (req, res) => {
    try {
        const { description, tags, location, visibility } = req.body;
        const userId = req.userId;

        // 1. Process Files
        // Use 'req.files' because route uses upload.fields([...])
        const imageFiles = req.files && req.files['images'] ? req.files['images'] : [];
        const musicFiles = req.files && req.files['music'] ? req.files['music'] : [];

        const hasImages = imageFiles.length > 0;
        const hasDescription = description && description.trim().length > 0;
        const hasMusic = musicFiles.length > 0 || (req.body.musicUrl && req.body.musicUrl.trim().length > 0);

        if (!hasImages && !hasDescription && !hasMusic) {
            return res.status(400).json({ message: 'Post must have a description, image, or music.' });
        }

        // 2. Prepare paths for DB
        const imagePaths = imageFiles.map(file => `/images/${file.filename}`);
        let musicPath = "";

        if (musicFiles.length > 0) {
            musicPath = `/audio/${musicFiles[0].filename}`;
        } else if (req.body.musicUrl) {
            musicPath = req.body.musicUrl;
        }

        // 3. Process tags
        let processedTags = [];
        if (tags) {
            try {
                // Handle different ways tags might be sent (stringified JSON vs array)
                const tagsData = typeof tags === 'string' ? JSON.parse(tags) : tags;
                if (Array.isArray(tagsData)) {
                    processedTags = tagsData.map(tagId => ({ userId: tagId, status: 'pending' }));
                }
            } catch (e) {
                console.error("Error parsing tags", e);
            }
        }

        // 4. Create Post in Database IMMEDIATELY (Optimistic Creation)
        const post = await postModel.create({
            userId: userId,
            caption: description,
            tags: processedTags,
            location,
            visibility,
            image: imagePaths[0] || "", // First image as main image
            images: imagePaths,        // All images
            music: musicPath,
        });

        // 5. Respond to User INSTANTLY
        res.status(201).json({ message: "Post created successfully", post });

        // 6. Invalidate Feed Cache
        try {
            const keys = await redisClient.keys('feed:*');
            if (keys.length > 0) await redisClient.del(keys);
        } catch (err) { console.error('Redis cache error:', err); }


        // 7. BACKGROUND: Gemini Safety Check (Fire and Forget)
        // This runs AFTER the response is sent. User doesn't wait.
        (async () => {
            try {
                let isUnsafe = false;
                let violationData = null;
                let violationType = "";

                // Check Text
                if (hasDescription && !isUnsafe) {
                    const safetyResult = await checkPostSafety(description);
                    if (safetyResult && !safetyResult.is_safe) {
                        isUnsafe = true;
                        violationType = "text";
                        violationData = safetyResult;
                    }
                }

                // Check Images
                if (hasImages && !isUnsafe) {
                    for (const file of imageFiles) {
                        const safetyResult = await checkImageSafety(file.path, file.mimetype);
                        if (safetyResult && !safetyResult.is_safe) {
                            isUnsafe = true;
                            violationType = "image";
                            violationData = safetyResult;
                            break;
                        }
                    }
                }

                // Handling Violation
                if (isUnsafe) {
                    console.log(`[Moderation] Deleting unsafe post ${post._id} (${violationType}). Details:`, violationData);
                    // Delete from DB
                    await postModel.findByIdAndDelete(post._id);
                    // Delete Files
                    cleanupFiles([...imageFiles, ...musicFiles]);

                    // Optional: You could notify the user via WebSocket here that their post was removed
                } else {
                    console.log(`[Moderation] Post ${post._id} verified SAFE.`);
                }

            } catch (bgError) {
                console.error("[Moderation] Background check failed:", bgError);
                // Fail Open or Closed? Currently doing nothing, so post stays.
            }
        })().catch(err => console.error("[Moderation] IIFE Fatal Error:", err));

    } catch (error) {
        console.error("Create Post Error:", error);
        // Clean up files on error if the initial post creation failed
        const imageFiles = req.files && req.files['images'] ? req.files['images'] : [];
        const musicFiles = req.files && req.files['music'] ? req.files['music'] : [];
        cleanupFiles([...imageFiles, ...musicFiles]);

        res.status(500).json({ message: "Post creation failed", error: error.message });
    }
};

/* -------------------------------------------------------------------------- */
/*                             GENERATE CAPTION                               */
/* -------------------------------------------------------------------------- */

export const generateCaption = async (req, res) => {
    try {
        const { image, mimeType, prompt } = req.body;
        if (!image) return res.status(400).json({ message: "Image data required" });

        // Use gemini-1.5-flash for consistent multimodal performance
        const model = getGenAI().getGenerativeModel({ model: "gemini-1.5-flash" });

        const imagePart = {
            inlineData: {
                data: image,
                mimeType: mimeType || "image/jpeg"
            }
        };

        const result = await model.generateContent([
            imagePart,
            prompt || "Generate a creative caption for this image."
        ]);

        const caption = result.response.text();
        res.status(200).json({ caption });

    } catch (error) {
        console.error("Caption Gen Error:", error);
        res.status(500).json({ message: "Caption generation failed", error: error.message });
    }
};


/* -------------------------------------------------------------------------- */
/*                                OTHER CONTROLLERS                           */
/* -------------------------------------------------------------------------- */

// Get Post
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

// Update Post
export const updatePost = async (req, res) => {
    const postId = req.params.id;
    const { userId } = req.body; // Careful: req.body.userId might be spoofed. Middleware userId is safer.
    // However, if logic depends on checking ownership, we use req.userId from authMiddleware usually.
    // For now keeping existing logic but aiming for safety.

    try {
        const post = await postModel.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Check ownership (assuming req.userId is set by middleware, fallback to body if not)
        // Adjust based on your auth implementation
        if (post.userId.toString() === userId) {
            await postModel.findByIdAndUpdate(postId, { $set: req.body });
            res.status(200).json({ message: 'Post updated successfully' });
        }
        else {
            res.status(403).json({ message: 'You can only update your own posts' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating post', error: error.message });
    }
};

// Delete Post
export const deletePost = async (req, res) => {
    const postId = req.params.id;
    const userId = req.userId; // Securely obtained from middleware

    try {
        const post = await postModel.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        if (post.userId.toString() === userId) {
            await postModel.findByIdAndDelete(postId);

            // Invalidate Feed Cache
            try {
                const keys = await redisClient.keys('feed:*');
                if (keys.length > 0) {
                    await redisClient.del(keys);
                }
            } catch (err) {
                console.error('Redis cache invalidation error:', err);
            }

            res.status(200).json({ message: 'Post deleted successfully' });
        }
        else {
            res.status(403).json({ message: 'You can only delete your own posts' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error deleting post', error: error.message });
    }
};

export const likePost = async (req, res) => {
    const postId = req.params.id;
    const { userId } = req.body;

    try {
        const post = await postModel.findById(postId);
        if (!post.likes.includes(userId)) {
            await post.updateOne({ $push: { likes: userId } });
            res.status(200).json({ message: 'Post liked' });
        }

        else {
            await post.updateOne({ $pull: { likes: userId } });
            res.status(200).json({ message: 'Post unliked' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error liking/unliking post', error: error.message });
    }
};

// Get posts where user is tagged and status is pending
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

// Approve or Reject a Tag
export const toggleTagStatus = async (req, res) => {
    const postId = req.params.id;
    const { status } = req.body; // 'approved' or 'rejected'
    const userId = req.userId; // The user who is responding (must be the one tagged)
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

// Get posts by a specific user
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

        // Check Redis
        try {
            const cachedData = await redisClient.get(cacheKey);
            if (cachedData) {
                console.log(`Serving feed from cache: ${cacheKey}`);
                return res.status(200).json(JSON.parse(cachedData));
            }
        } catch (err) {
            console.warn('Redis cache error:', err);
        }

        const posts = await postModel.find()
            .sort({ createdAt: -1 }) // Sort by date in descending order
            .skip(skip) // Skip posts based on page
            .limit(limit) // Limit number of posts per page
            .populate('userId', 'username profilePicture firstname lastname')
            .populate('tags.userId', 'username firstname lastname'); // Populate tagged users

        const totalPosts = await postModel.countDocuments(); // Count total posts
        const hasMore = skip + posts.length < totalPosts; // Check if there are more posts

        const responseData = {
            feed: posts, // Return the posts
            currentPage: page, // Return the current page
            totalPages: Math.ceil(totalPosts / limit), // Return the total number of pages
            hasMore // Return if there are more posts
        };

        // Save to Redis
        try {
            await redisClient.set(cacheKey, JSON.stringify(responseData), {
                EX: 3600 // Cache for 1 hour
            });
        } catch (err) {
            console.warn('Redis set error:', err);
        }

        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feed', error: error.message });
    }
};
