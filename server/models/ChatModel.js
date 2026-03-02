import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
    }],
    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Messages',
    }],
}, { timestamps: true });

export default ChatModel = mongoose.model('Chat', ChatSchema);
