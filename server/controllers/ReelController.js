import ReelModel from "../models/ReelModel.js";
import multer from 'multer';
import path from 'path';

// Multer Storage for Reels (Vertical short videos)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/reels");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    },
});

export const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error("Only video files are allowed"), false);
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Create Reel
export const createReel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No video provided" });
        }
        const { caption, musicTitle, musicArtist } = req.body;
        const userId = req.userId;

        const reel = await ReelModel.create({
            userId,
            video: `/reels/${req.file.filename}`,
            caption: caption || "",
            music: {
                title: musicTitle || "Original Audio",
                artist: musicArtist || ""
            }
        });

        res.status(201).json({ message: "Reel posted successfully", reel });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get Feed Reels
export const getReels = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const reels = await ReelModel.find()
            .populate("userId", "username profilePicture firstname lastname isVerified")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        res.status(200).json(reels);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get User Reels
export const getUserReels = async (req, res) => {
    try {
        const reels = await ReelModel.find({ userId: req.params.userId })
            .populate("userId", "username profilePicture firstname lastname isVerified")
            .sort({ createdAt: -1 });
        res.status(200).json(reels);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Toggle Like
export const likeReel = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const reel = await ReelModel.findById(id);
        
        const isLiked = reel.likes.some(id => id.toString() === userId.toString());
        if (!isLiked) {
            await reel.updateOne({ $push: { likes: userId } });
            res.status(200).json({ liked: true, likesCount: reel.likes.length + 1 });
        } else {
            await reel.updateOne({ $pull: { likes: userId } });
            res.status(200).json({ liked: false, likesCount: reel.likes.length - 1 });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Add Comment
export const commentReel = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;
        const userId = req.userId;

        const updatedReel = await ReelModel.findByIdAndUpdate(id, {
            $push: { comments: { userId, text, createdAt: new Date() } }
        }, { new: true }).populate("comments.userId", "username profilePicture");

        res.status(201).json(updatedReel.comments[updatedReel.comments.length - 1]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Single Reel Details
export const getReelById = async (req, res) => {
    try {
        const reel = await ReelModel.findById(req.params.id)
            .populate("userId", "username profilePicture firstname lastname isVerified")
            .populate("comments.userId", "username profilePicture");
            
        if (!reel) return res.status(404).json({ message: "Reel not found" });
        res.status(200).json(reel);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Increment Views
export const incrementViews = async (req, res) => {
    try {
        await ReelModel.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
        res.status(200).json({ message: "View updated" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
