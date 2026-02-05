import UserModel from "../models/userModel.js";
import { getCache, setCache, deleteCache } from "../services/cacheServices.js";
import { redisClient } from "../config/redis.js";

// Search Users
export const searchUser = async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ message: "Search query required" });
    try {
        const users = await UserModel.find({
            username: { $regex: query, $options: "i" }
        }).select("username firstname lastname profilePicture _id").limit(10);
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Error searching users", error: error.message });
    }
};

// Get user profile
export const getUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        const cacheKey = `userProfile:${userId}`;

        const cachedUser = await getCache(cacheKey);
        if (cachedUser) {
            return res.status(200).json(cachedUser);
        }
        const userProfile = await UserModel.findById(userId).select('-password').populate("followers following", "username profilePicture firstname lastname");
        if (!userProfile) {
            return res.status(404).json({ message: 'User not found' });
        }

        await setCache(cacheKey, userProfile, 3600);
        res.json(userProfile);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

// Update user profile
export const updateUserProfile = async (req, res) => {
    try {
        const updateData = { ...req.body };
        // If file uploaded, update profilePicture field
        if (req.file) {
            updateData.profilePicture = req.file.filename;
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).select('-password');

        await deleteCache(`userProfile:${req.params.id}`);
        res.json({ message: 'User profile updated successfully', user: updatedUser });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

// Delete user profile
export const deleteUserProfile = async (req, res) => {
    const id = req.params.id;
    const { currentUserId, CurrentUserAdminStatus } = req.body;
    if (id === currentUserId || CurrentUserAdminStatus) {
        try {
            await UserModel.findByIdAndDelete(id);
            res.status(200).json({ message: 'User profile deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting user profile', error: error.message });
        }
    } else {
        res.status(403).json({ message: 'Unauthorized to delete this profile' });
    }
}

// Follow a user (Now sends a request)
export const followUser = async (req, res) => {
    const id = req.params.id; // User to be followed
    const currentUserId = req.userId; // User who is following
    if (id === currentUserId) {
        res.status(403).json({ message: 'Cannot follow yourself' });
    } else {
        try {
            const followUser = await UserModel.findById(id);
            const followingUser = await UserModel.findById(currentUserId);

            // Check if already following
            if (followUser.followers.includes(currentUserId)) {
                return res.status(403).json({ message: 'You are already following this user' });
            }

            // Check if request already sent
            if (followUser.followRequests.includes(currentUserId)) {
                return res.status(403).json({ message: 'Follow request already sent' });
            }

            // Push to followRequests
            await followUser.updateOne({ $push: { followRequests: currentUserId } });

            // Create Notification
            const NotificationModel = (await import("../models/NotificationModel.js")).default;
            await NotificationModel.create({
                recipientId: id,
                senderId: currentUserId,
                type: 'follow_request'
            });

            res.status(200).json({ message: 'Follow request sent successfully' });

        } catch (error) {
            res.status(500).json({ message: 'Error following user', error: error.message });
        }
    }
}

// Unfollow a user
export const unfollowUser = async (req, res) => {
    const id = req.params.id;
    const currentUserId = req.userId;

    if (id === currentUserId) {
        res.status(403).json({ message: 'Action forbidden: You cannot unfollow yourself' });
    } else {
        try {
            const unfollowUser = await UserModel.findById(id);
            const unfollowingUser = await UserModel.findById(currentUserId);

            if (unfollowUser.followers.includes(currentUserId)) {
                await unfollowUser.updateOne({ $pull: { followers: currentUserId } });
                await unfollowingUser.updateOne({ $pull: { following: id } });

                await redisClient.del(`userProfile:${id}`);
                await redisClient.del(`userProfile:${currentUserId}`);
                await redisClient.del(`followers:${id}`);
                await redisClient.del(`following:${currentUserId}`);

                res.status(200).json({ message: 'User unfollowed successfully' });
            } else {
                res.status(403).json({ message: 'You are not following this user' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Error unfollowing user', error: error.message });
        }
    }
}

// Update user profile (Alternative endpoint or legacy)
export const updateProfile = async (req, res) => {
    const { bio, username, profilePicture } = req.body;
    try {
        const user = await UserModel.findByIdAndUpdate(
            req.userId,
            { bio, username, profilePicture },
            { new: true }
        ).select("-password");

        await redisClient.del(`userProfile:${req.userId}`);
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};

// Suggested users
export const suggestedUsers = async (req, res) => {
    try {
        const currentUser = await UserModel.findById(req.userId);
        if (!currentUser) return res.status(404).json({ message: "User not found" });

        const users = await UserModel.find({
            _id: { $nin: [...(currentUser.following || []), req.userId] },
        }).select("username profilePicture firstname lastname").limit(10);

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Error fetching suggestions", error: error.message });
    }
};

// Get Followers List
export const getFollowers = async (req, res) => {
    const userId = req.params.id;
    const cacheKey = `followers:${userId}`;

    try {
        const cachedFn = await redisClient.get(cacheKey);
        if (cachedFn) {
            return res.status(200).json(JSON.parse(cachedFn));
        }

        const user = await UserModel.findById(userId).populate('followers', 'username profilePicture firstname lastname');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const followers = user.followers;
        await redisClient.set(cacheKey, JSON.stringify(followers), { EX: 3600 });

        res.status(200).json(followers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching followers', error: error.message });
    }
};

// Get Following List
export const getFollowing = async (req, res) => {
    const userId = req.params.id;
    const cacheKey = `following:${userId}`;

    try {
        const cachedFn = await redisClient.get(cacheKey);
        if (cachedFn) {
            return res.status(200).json(JSON.parse(cachedFn));
        }

        const user = await UserModel.findById(userId).populate('following', 'username profilePicture firstname lastname');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const following = user.following;
        await redisClient.set(cacheKey, JSON.stringify(following), { EX: 3600 });

        res.status(200).json(following);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching following', error: error.message });
    }
};

// Get Mutual Followers
export const getMutualFollowers = async (req, res) => {
    const userId = req.params.id; // The profile we are viewing
    const currentUserId = req.userId; // Me

    const cacheKey = `mutual:${userId}:${currentUserId}`;

    try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.status(200).json(JSON.parse(cachedData));
        }

        const viewingProfileUser = await UserModel.findById(userId);
        const currentUser = await UserModel.findById(currentUserId);

        if (!viewingProfileUser || !currentUser) return res.status(404).json({ message: 'User not found' });

        const mutuals = await UserModel.find({
            _id: { $in: viewingProfileUser.followers },
            following: currentUserId // This is simplified, real mutual is intersection
        }).select('username profilePicture firstname lastname');

        // Let's do it properly
        const commonIds = viewingProfileUser.followers.filter(id => currentUser.following.includes(id.toString()));
        const properMutuals = await UserModel.find({ _id: { $in: commonIds } }).select('username profilePicture firstname lastname');

        await redisClient.set(cacheKey, JSON.stringify(properMutuals), { EX: 3600 });
        res.status(200).json(properMutuals);

    } catch (error) {
        res.status(500).json({ message: 'Error fetching mutuals', error: error.message });
    }
};

// Get Pending Follow Requests
export const getFollowRequests = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId).populate('followRequests', 'username profilePicture firstname lastname');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user.followRequests);
    } catch (error) {
        res.status(500).json({ message: "Error fetching requests", error: error.message });
    }
};

// Accept Follow Request
export const acceptFollowRequest = async (req, res) => {
    const requesterId = req.params.id; // The person who wants to follow me
    const currentUserId = req.userId; // Me

    try {
        const currentUser = await UserModel.findById(currentUserId);
        const requester = await UserModel.findById(requesterId);

        if (!currentUser.followRequests.includes(requesterId)) {
            return res.status(404).json({ message: "Request not found" });
        }

        // Move from requests to followers
        await currentUser.updateOne({
            $pull: { followRequests: requesterId },
            $push: { followers: requesterId }
        });

        // Add me to their following
        await requester.updateOne({ $push: { following: currentUserId } });

        // Create Notification for them
        const NotificationModel = (await import("../models/NotificationModel.js")).default;
        await NotificationModel.create({
            recipientId: requesterId,
            senderId: currentUserId,
            type: 'follow_accept'
        });

        // Clear cache
        await redisClient.del(`userProfile:${currentUserId}`);
        await redisClient.del(`userProfile:${requesterId}`);

        res.status(200).json({ message: "Follow request accepted" });

    } catch (error) {
        res.status(500).json({ message: "Error accepting request", error: error.message });
    }
};

// Reject Follow Request
export const rejectFollowRequest = async (req, res) => {
    const requesterId = req.params.id;
    const currentUserId = req.userId;

    try {
        const currentUser = await UserModel.findById(currentUserId);
        if (!currentUser.followRequests.includes(requesterId)) {
            return res.status(404).json({ message: "Request not found" });
        }

        await currentUser.updateOne({ $pull: { followRequests: requesterId } });
        res.status(200).json({ message: "Follow request rejected" });

    } catch (error) {
        res.status(500).json({ message: "Error rejecting request", error: error.message });
    }
};