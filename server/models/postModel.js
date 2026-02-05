import mongoose from "mongoose";
const PostSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    caption: String,
    image: String,
    images: { type: [String], default: [] },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    tags: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
    }],
    location: String,
    music: String, // Store music track name or ID
    visibility: { type: String, enum: ['public', 'followers', 'close_friends'], default: 'public' },
    isModerated: { type: Boolean, default: false },
    isSafe: { type: Boolean, default: true },
    behaviorAudit: {
        category: String,
        reasoning: String,
        confidence: Number,
        timestamp: { type: Date, default: Date.now }
    }
}, { timestamps: true }
);
var Post = mongoose.model("Post", PostSchema);
export default Post;