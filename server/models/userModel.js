import mongoose from 'mongoose';
const Schema = mongoose.Schema;
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true
    },
    firstname: {
        type: String,
        required: false,
    },
    lastname: {
        type: String,
        required: false,
    },
    profilePicture: {
        type: String,
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    bio: {
        type: String,
        default: "",
    },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }], // Pending follow requests
    publicKey: {
        type: String, // Store client-side generated public key
        required: false,
    },
    savedPosts: [
        {
            type: Schema.Types.ObjectId,
            ref: "Post",
            default: [],
        },
    ],
}, { timestamps: true });
userSchema.index({ username: 'text' });

export default mongoose.model('Users', userSchema);