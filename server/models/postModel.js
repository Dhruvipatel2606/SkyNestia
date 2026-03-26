import mongoose from "mongoose";
const PostSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    caption: { type: String, default: "" },
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    hashtags: [{ type: String, index: true }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comments' }],
    tags: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
    }],
    location: String,
    music: String, // Store music track name or ID
    visibility: { type: String, enum: ['public', 'followers', 'close_friends'], default: 'public' },
    status: { type: String, enum: ['draft', 'published', 'scheduled'], default: 'published' },
    scheduledDate: { type: Date },
    isModerated: { type: Boolean, default: false },
    isSafe: { type: Boolean, default: true },
    behaviorAudit: {
        category: String,
        reasoning: String,
        confidence: Number,
        timestamp: { type: Date, default: Date.now }
    },
    hiddenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }]
}, { timestamps: true }
);
export default mongoose.model("Post", PostSchema);
