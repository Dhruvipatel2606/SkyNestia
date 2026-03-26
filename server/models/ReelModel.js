import mongoose from 'mongoose';

const ReelSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    video: {
        type: String,
        required: true
    },
    caption: {
        type: String,
        maxlength: 2200
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users'
    }],
    comments: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Users'
        },
        text: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    music: {
        title: { type: String, default: "Original Audio" },
        artist: { type: String }
    },
    views: {
        type: Number,
        default: 0
    },
    sharesCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

export default mongoose.model('Reel', ReelSchema);
