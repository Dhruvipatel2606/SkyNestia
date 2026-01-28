import postModel from "../models/postModel.js";
import multer from 'multer';
import path from 'path';
import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

//Check if image is safe or not. Make isSafe boolen variable 
let isSafe = false;
export async function main() {
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Check if this image is safe for work",
    });
    if (response.text === "unsafe") {
        isSafe = false;
    }
    else {
        isSafe = true;
    }
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'music') {
            cb(null, "public/audio");
        } else {
            cb(null, "public/images");
        }
    },
    filename: (req, file, cb) => {
        cb(null, req.body.name || Date.now() + path.extname(file.originalname));
    },
});
export const upload = multer({ storage: storage });

// Create a new Post
export const createPost = async (req, res) => {

    await main();
    if (!isSafe) {
        return res.status(400).json({ message: 'Image is not safe for work' });
        isSafe = true;
    }

    const { description, tags, location, visibility } = req.body;

    // Process tags (safe parsing)
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

    const imageFiles = req.files && req.files['images'] ? req.files['images'] : [];
    const musicFiles = req.files && req.files['music'] ? req.files['music'] : [];

    const hasImages = imageFiles.length > 0;
    const hasDescription = description && description.trim().length > 0;
    const hasMusic = musicFiles.length > 0;

    if (!hasImages && !hasDescription && !hasMusic) {
        return res.status(400).json({ message: 'Post must have a description, image, or music.' });
    }

    // Handle images
    const imagePaths = imageFiles.map(file => `/images/${file.filename}`);

    // Handle music
    let musicPath = req.body.music || ""; // Fallback to string if provided
    if (musicFiles.length > 0) {
        musicPath = `/audio/${musicFiles[0].filename}`;
    }

    const newPost = new postModel({
        userId: req.userId,
        description,
        images: imagePaths,
        image: imagePaths[0] || "",
        tags: processedTags,
        location,
        music: musicPath,
        visibility
    });
    try {
        await newPost.save();
        isSafe = false;
        await main();
        if (!isSafe) {
            await newPost.deleteOne();
            return res.status(400).json({ message: 'Image is not safe for work' });
        }
        else {
            res.status(201).json({ message: 'Post created successfully', post: newPost });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error creating post', error: error.message });
    }
};

//generate caption
export const generateCaption = async (req, res) => {
    const { image } = req.body;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Generate a caption for this image: ${image}`,
        });
        res.status(200).json({ caption: response.text });
    } catch (error) {
        res.status(500).json({ message: 'Error generating caption', error: error.message });
    }
};

// Get Post
export const getPost = async (req, res) => {
    const id = req.params.id;
    try {
        const post = await postModel.findById(id);
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
    const { userId } = req.body;
    try {
        const post = await postModel.findById(postId);
        if (post.userId === userId) {
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
    const { userId } = req.body;
    try {
        const post = await postModel.findById(postId);
        if (post.userId === userId) {
            await postModel.findByIdAndDelete(postId);
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
    try {
        const posts = await postModel.find({ userId })
            .sort({ createdAt: -1 })
            .populate('userId', 'username profilePicture firstname lastname');
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user posts', error: error.message });
    }
};

export const getFeed = async (req, res) => {

    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const posts = await postModel.find()
            .sort({ createdAt: -1 }) // Sort by date in descending order
            .skip(skip) // Skip posts based on page
            .limit(limit) // Limit number of posts per page
            .populate('userId', 'username profilePicture firstname lastname')
            .populate('tags.userId', 'username firstname lastname'); // Populate tagged users

        const totalPosts = await postModel.countDocuments(); // Count total posts
        const hasMore = skip + posts.length < totalPosts; // Check if there are more posts

        res.status(200).json({
            feed: posts, // Return the posts
            currentPage: page, // Return the current page
            totalPages: Math.ceil(totalPosts / limit), // Return the total number of pages
            hasMore // Return if there are more posts
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching feed', error: error.message });
    }
};