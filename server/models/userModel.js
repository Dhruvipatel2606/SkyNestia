import mongoose from 'mongoose';
const Schema = mongoose.Schema;
const userSchema = new Schema({
    // --- Identity ---
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: function () { return !this.googleId; }, // Password required only if not using Google Auth
        select: false, // Don't return password by default
        trim: true
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },

    // --- Profile ---
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
        default: "",
    },
    coverPicture: {
        type: String,
        default: "",
    },
    bio: {
        type: String,
        default: "",
        maxlength: 500
    },

    // --- Social Graph ---
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
    followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }], // Pending follow requests

    // --- Posts ---
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post', ref: 'Post' }],
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post', ref: 'Post' }],

    // --- Privacy & State Machine ---
    isPrivate: {
        type: Boolean,
        default: false,
    },
    privacySettings: {
        messaging: { type: String, enum: ['everyone', 'followers', 'none'], default: 'everyone' },
        storyView: { type: String, enum: ['everyone', 'followers', 'close_friends'], default: 'everyone' },
        tagging: { type: String, enum: ['everyone', 'followers', 'none'], default: 'everyone' }
    },

    // --- Attributes ---
    isAdmin: {
        type: Boolean,
        default: false
    },
    isVerified: { // The "Blue Tick" visual
        type: Boolean,
        default: false,
    },
    verificationStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'rejected'],
        default: 'none'
    },
    publicKey: {
        type: String, // Store client-side generated public key
        required: false,
    },

    // --- Security ---
    refreshToken: {
        type: String,
        select: false
    },
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        select: false
    },
    otp: {
        code: String,
        expiresAt: Date
    },

    // --- Lifecycle ---
    accountStatus: {
        type: String,
        enum: ['active', 'deactivated', 'suspended', 'deleted'],
        default: 'active'
    },
    deactivationDate: { type: Date },
    lastLogin: { type: Date },

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