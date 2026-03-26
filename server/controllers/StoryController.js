import StoryModel from "../models/StoryModel.js";
import UserModel from "../models/userModel.js";
import ChatModel from "../models/ChatModel.js";
import MessageModel from "../models/MessageModel.js";
import multer from 'multer';
import path from 'path';

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/stories");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    },
});

export const upload = multer({ storage: storage });

export const createStory = async (req, res) => {
    try {
        const { mediaType, stickers, music, drawing } = req.body;
        const userId = req.userId;

        if (!req.file) {
            return res.status(400).json({ message: 'Story must have a media file.' });
        }

        const mediaPath = `/stories/${req.file.filename}`;

        const storyData = {
            userId,
            media: mediaPath,
            mediaType: mediaType || 'image',
            stickers: stickers ? JSON.parse(stickers) : [],
            music: music ? JSON.parse(music) : null,
            drawing: drawing || ""
        };

        const story = await StoryModel.create(storyData);
        res.status(201).json({ message: "Story created successfully", story });
    } catch (error) {
        console.error("Create Story Error:", error);
        res.status(500).json({ message: "Story creation failed", error: error.message });
    }
};

export const getStories = async (req, res) => {
    try {
        // Fetch all non-expired stories from self and followed users
        // For simplicity, fetching all current stories here (optional: filter by follow logic later)
        const stories = await StoryModel.find()
            .populate('userId', 'username profilePicture')
            .sort({ createdAt: -1 });

        res.status(200).json(stories);
    } catch (error) {
        res.status(500).json({ message: "Error retrieving stories", error: error.message });
    }
};

export const viewStory = async (req, res) => {
    try {
        const { storyId } = req.params;
        const userId = req.userId;

        const story = await StoryModel.findByIdAndUpdate(
            storyId,
            { $addToSet: { viewers: userId } },
            { new: true }
        );

        if (!story) return res.status(404).json({ message: "Story not found" });

        res.status(200).json({ message: "Story viewed", story });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const reactToStory = async (req, res) => {
    try {
        const { storyId } = req.params;
        const { type } = req.body;
        const userId = req.userId;

        const story = await StoryModel.findById(storyId);
        if (!story) return res.status(404).json({ message: "Story not found" });

        // Check if user already reacted
        const existingReaction = story.reactions.find(r => r.userId.toString() === userId);
        if (existingReaction) {
            existingReaction.type = type;
        } else {
            story.reactions.push({ userId, type });
        }

        await story.save();
        res.status(200).json({ message: "Reaction added", story });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteStory = async (req, res) => {
    try {
        const { storyId } = req.params;
        const story = await StoryModel.findOneAndDelete({ _id: storyId, userId: req.userId });
        if (!story) return res.status(404).json({ message: "Story not found or unauthorized" });
        res.status(200).json({ message: "Story deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const toggleSaveStory = async (req, res) => {
    try {
        const { storyId } = req.params;
        const user = await UserModel.findById(req.userId);
        if (!user.savedStories) user.savedStories = [];
        if (user.savedStories.includes(storyId)) {
            user.savedStories = user.savedStories.filter(id => id.toString() !== storyId);
        } else {
            user.savedStories.push(storyId);
        }
        await user.save();
        res.status(200).json({ saved: user.savedStories.includes(storyId) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const replyToStory = async (req, res) => {
    try {
        const { storyId } = req.params;
        const { text } = req.body;
        const story = await StoryModel.findById(storyId);
        if (!story) return res.status(404).json({ message: "Story not found" });

        // Find or Create Chat between replier and story owner
        let chat = await ChatModel.findOne({
            members: { $all: [req.userId, story.userId] }
        });

        if (!chat) {
            chat = await ChatModel.create({ members: [req.userId, story.userId] });
        }

        // Create Message (story reply)
        const message = await MessageModel.create({
            chatId: chat._id,
            senderId: req.userId,
            text: `Replied to your story: \n\n${text}`,
            image: story.media // Include story preview for context
        });

        res.status(200).json({ message });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
