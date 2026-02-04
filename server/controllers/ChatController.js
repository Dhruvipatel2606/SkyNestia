import ChatModel from '../models/ChatModel.js';

// Create a new chat
export const createChat = async (req, res) => {
    try {
        const existingChat = await ChatModel.findOne({
            members: { $all: [req.body.senderId, req.body.receiverId] },
        });

        if (existingChat) return res.status(200).json(existingChat);

        const newChat = new ChatModel({
            members: [req.body.senderId, req.body.receiverId],
        });
        const result = await newChat.save();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

// Get all chats for a user
export const userChats = async (req, res) => {
    try {
        const chat = await ChatModel.find({
            members: { $in: [req.params.userId] },
        });
        res.status(200).json(chat);
    } catch (error) {
        res.status(500).json(error);
    }
};

// find chat
export const findChat = async (req, res) => {
    try {
        const chat = await ChatModel.findOne({
            members: { $all: [req.params.firstId, req.params.secondId] },
        });
        res.status(200).json(chat);
    } catch (error) {
        res.status(500).json(error);
    }
};

//delete chat
export const deleteChat = async (req, res) => {
    try {
        const chat = await ChatModel.findOneAndDelete({
            members: { $all: [req.params.firstId, req.params.secondId] },
        });
        res.status(200).json(chat);
    } catch (error) {
        res.status(500).json(error);
    }
};