import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    refreshToken: {
        type: String,
        required: true,
        unique: true
    },
    ip: String,
    device: {
        browser: String,
        os: String,
        platform: String,
        isMobile: Boolean
    },
    location: {
        city: String,
        country: String
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '7d' // Automatically remove sessions after 7 days (matching refresh token expiry)
    }
});

const SessionModel = mongoose.model('Session', sessionSchema);
export default SessionModel;
