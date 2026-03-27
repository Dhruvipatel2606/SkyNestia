import MessageModel from '../models/MessageModel.js';
import multer from 'multer';
import path from 'path';

// Multer Storage Configuration for Chat
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/chat");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    },
});

export const upload = multer({ storage: storage });

export const addMessage = async (req, res) => {
    const { chatId, senderId, receiverId, text, isCallLog, callDuration } = req.body;
    let imagePath = "";
    if (req.file) {
        imagePath = `/chat/${req.file.filename}`;
    }

    try {
        const receiver = await (await import("../models/userModel.js")).default.findById(receiverId);
        if (!receiver) return res.status(404).json({ message: "Receiver not found" });

        const setting = receiver.privacySettings?.messaging || 'everyone';
        if (setting === 'none' && senderId !== receiverId) {
            return res.status(403).json({ message: "This user has disabled direct messaging" });
        }

        if (setting === 'followers' && senderId !== receiverId) {
            const isFollowing = receiver.followers.some(f => f.toString() === senderId);
            if (!isFollowing) {
                return res.status(403).json({ message: "Only followers can message this user" });
            }
        }

        const message = new MessageModel({
            chatId,
            senderId,
            receiverId,
            text,
            image: imagePath,
            isCallLog: isCallLog || false,
            callDuration: callDuration || null
        });

        const result = await message.save();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

export const getMessages = async (req, res) => {
    const { chatId } = req.params;
    try {
        const result = await MessageModel.find({ chatId });
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

// mark messages as read
export const markAsRead = async (req, res) => {
    const { chatId, userId } = req.params;
    try {
        // Mark messages where I am the receiver and they are currently unread
        const result = await MessageModel.updateMany(
            { chatId: chatId, receiverId: userId, isRead: false },
            { $set: { isRead: true } }
        );
        res.status(200).json({ message: "Messages marked as read", result });
    } catch (error) {
        res.status(500).json(error);
    }
};

// delete message
export const deleteMessage = async (req, res) => {
    const { messageId } = req.params;
    try {
        const result = await MessageModel.findByIdAndDelete(messageId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json(error);
    }
};



