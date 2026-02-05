import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
    type: { type: String, enum: ['like', 'follow_request', 'follow_accept', 'comment'], required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    read: { type: Boolean, default: false }
}, { timestamps: true });

const NotificationModel = mongoose.model("Notification", notificationSchema);
export default NotificationModel;
