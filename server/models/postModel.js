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
    access: { type: String, enum: ['public', 'followers', 'close_friends'], default: 'public' },
    music: String, // Store music track name or ID
    visibility: { type: String, enum: ['public', 'followers', 'close_friends'], default: 'public' }
}, { timestamps: true }
);
var Post = mongoose.model("Post", PostSchema);
export default Post;