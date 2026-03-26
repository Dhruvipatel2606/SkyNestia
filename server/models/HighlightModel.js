import mongoose from 'mongoose';

const HighlightSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    title: {
        type: String,
        required: true,
        default: 'Highlight'
    },
    coverImage: {
        type: String, // Path to the story media used as cover
    },
    stories: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Story'
    }]
}, { timestamps: true });

export default mongoose.model('Highlight', HighlightSchema);
