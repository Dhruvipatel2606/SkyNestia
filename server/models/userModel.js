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
    phone: {
        type: String,
        required: false,
        trim: true
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
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }], // Users blocked by this user
    restrictedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }], // Users restricted by this user

    // --- Posts ---
    posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],

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

    // --- Admin Controls ---
    banReason: { type: String, default: '' },
    restrictionReason: { type: String, default: '' },
    restrictions: {
        canPost: { type: Boolean, default: true },
        canComment: { type: Boolean, default: true },
        canMessage: { type: Boolean, default: true }
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
        enum: ['active', 'deactivated', 'suspended', 'banned', 'deleted'],
        default: 'active'
    },
    deactivationDate: { type: Date },
    lastLogin: { type: Date },
    loginCount: {
        type: Number,
        default: 0
    },
    appUsage: [{
        date: String, // YYYY-MM-DD format
        timeSpent: { type: Number, default: 0 } // Time in seconds
    }],



}, { timestamps: true });
userSchema.index({ username: 'text' });

export default mongoose.model('Users', userSchema);