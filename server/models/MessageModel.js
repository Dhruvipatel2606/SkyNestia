import mongoose from 'mongoose';

const MessageSchema = mongoose.Schema({
    chatId: {
        type: String,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
    },
    message: {
        type: String,
        required: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    isCallLog: {
        type: Boolean,
        default: false,
    },
    callDuration: {
        type: String,
        default: null,
    }
}, { timestamps: true });

const MessageModel = mongoose.model('Message', MessageSchema);
export default MessageModel;
