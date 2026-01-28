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
            return res.status(200).json({ source: 'cache', profile: JSON.parse(cachedUser) });
        }
        const userProfile = await UserModel.findById(userId).select('-password').populate("followers following", "username profilePicture");;
        if (!userProfile) {
            return res.status(404).json({ message: 'User not found' });
        }

        await setCache(cacheKey, userProfile, 3600);
        await redisClient.setEx(cacheKey, 300, JSON.stringify(userProfile));
        res.json(userProfile);

        res.json({ source: 'database', profile: userProfile });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

export const updateUserProfile = async (req, res) => {
    try {
        const updatedUser = await UserModel.findByIdAndUpdate(
            req.params.id,
            req.body,
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

// Follow a user
export const followUser = async (req, res) => {
    const id = req.params.id; // User to be followed
    const currentUserId = req.userId; // User who is following
    if (id === currentUserId) {
        // if someone is trying to follow themselves
        res.status(403).json({ message: 'Cannot follow yourself' });
    } else {
        try {
            const followUser = await UserModel.findById(id);
            // follow user following upper one
            const followingUser = await UserModel.findById(currentUserId);
            //if current user is not already following the target user
            if (!followUser.followers.includes(currentUserId)) {
                //updating both followers and following lists
                await followUser.updateOne({ $push: { followers: currentUserId } });
                await followingUser.updateOne({ $push: { following: id } });

                await id.save();
                await currentUserId.save();

                await redisClient.del(`user:${id}`);
                await redisClient.del(`user:${currentUserId}`);

                return res.status(200).json({ message: 'User followed successfully' });
            } else {
                //Forbidden if already following
                res.status(403).json({ message: 'You are already following this user' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Error following user', error: error.message });
        }
    }
}

// Unfollow a user
export const unfollowUser = async (req, res) => {
    const id = req.params.id;
    // User to be unfollowed
    const { currentUserId } = req.body;
    // User who is unfollowing
    if (id === currentUserId) { // if someone is trying to unfollow themselves
        res.status(403).json({ message: 'Action forbidden: You cannot unfollow yourself' });
    } else {
        try {
            //find both users
            const unfollowUser = await UserModel.findById(id);
            const unfollowingUser = await UserModel.findById(currentUserId);

            id.followers.$pull(currentUserId);
            currentUserId.following.$pull(id);

            await id.save();
            await currentUserId.save();

            await redisClient.del(`user:${id}`);
            await redisClient.del(`user:${currentUserId}`);
            //if current user is already following the target user
            if (unfollowUser.followers.includes(currentUserId)) {
                //updating both followers and following lists
                await unfollowUser.updateOne({ $pull: { followers: currentUserId } });
                await unfollowingUser.updateOne({ $pull: { following: id } });
                res.status(200).json({ message: 'User unfollowed successfully' });
            } else { //Forbidden if not following
                res.status(403).json({ message: 'You are not following this user' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Error unfollowing user', error: error.message });
        }
    }
}

//Update user profile
export const updateProfile = async (req, res) => {
    const { bio, username, profilePicture } = req.body;

    const user = await UserModel.findByIdAndUpdate(
        req.userId,
        { bio, username, profilePicture },
        { new: true }
    ).select("-password");

    await redisClient.del(`user:${req.userId}`);

    res.json(user);
};

//Suggested users
export const suggestedUsers = async (req, res) => {
    const users = await UserModel.find({
        _id: { $ne: req.userId },
    }).select("username profilePicture").limit(10);
    res.json(users);
};  