import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
    reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    targetType: { type: String, enum: ['post', 'user'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    reason: {
        type: String,
        enum: ['spam', 'harassment', 'inappropriate', 'hate_speech', 'violence', 'misinformation', 'other'],
        required: true
    },
    description: { type: String, default: '', maxlength: 500 },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'dismissed'],
        default: 'pending'
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    reviewedAt: { type: Date },
    adminNote: { type: String, default: '' }
}, { timestamps: true });

ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetId: 1 });

export default mongoose.model('Report', ReportSchema);
