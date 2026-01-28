import mongoose from "mongoose";
const PostSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    description: String,
    image: String,
    images: { type: [String], default: [] },
    likes: { type: Array, default: [] },
    tags: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
    }],
    location: String,
    music: String, // Store music track name or ID
    visibility: { type: String, enum: ['public', 'followers', 'close_friends'], default: 'public' }
}, { timestamps: true }
);
var Post = mongoose.model("Post", PostSchema);
export default Post;