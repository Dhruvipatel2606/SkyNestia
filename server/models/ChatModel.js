import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
    }],
    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Messages',
    }],
}, { timestamps: true });

export default mongoose.model('Chat', ChatSchema);
