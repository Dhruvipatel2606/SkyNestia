import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    media: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    reactions: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
        type: { type: String, default: 'like' }
    }],
    stickers: [{
        type: { type: String, enum: ['emoji', 'sticker', 'music_tag', 'text'], default: 'emoji' },
        content: String,
        x: Number,
        y: Number,
        rotation: { type: Number, default: 0 },
        scale: { type: Number, default: 1 }
    }],
    music: {
        trackId: String,
        title: String,
        artist: String,
        previewUrl: String,
        startTime: { type: Number, default: 0 }
    },
    drawing: { type: String }, // Base64 or SVG path data
    isSaved: { type: Boolean, default: false }, // For highlighting/archiving
    createdAt: { type: Date, default: Date.now, expires: 86400 }
}, { timestamps: true });

export default mongoose.model("Story", storySchema);
