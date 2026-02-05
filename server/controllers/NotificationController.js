import NotificationModel from "../models/NotificationModel.js";

// Get Notifications for current user
export const getNotifications = async (req, res) => {
    try {
        const notifications = await NotificationModel.find({ recipientId: req.userId })
            .sort({ createdAt: -1 })
            .populate('senderId', 'username profilePicture firstname lastname')
            .populate('postId', 'image');

        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: "Error fetching notifications", error: error.message });
    }
};

// Mark notifications as read (Optional, for future use)
export const markNotificationsRead = async (req, res) => {
    try {
        await NotificationModel.updateMany(
            { recipientId: req.userId, read: false },
            { $set: { read: true } }
        );
        res.status(200).json({ message: "Notifications marked read" });
    } catch (error) {
        res.status(500).json({ message: "Error updating notifications", error: error.message });
    }
};
