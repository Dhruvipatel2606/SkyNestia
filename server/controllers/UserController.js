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
            return res.status(200).json({ source: 'cache', profile: cachedUser });
        }
        const userProfile = await UserModel.findById(userId).select('-password').populate("followers following", "username profilePicture");;
        if (!userProfile) {
            return res.status(404).json({ message: 'User not found' });
        }

        await setCache(cacheKey, userProfile, 3600);
        res.json(userProfile);

        // res.json({ source: 'database', profile: userProfile }); // Duplicate response removed
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
                await redisClient.del(`userProfile:${id}`);
                await redisClient.del(`userProfile:${currentUserId}`);
                await redisClient.del(`followers:${id}`); // Invalidate target followers cache

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
    const { currentUserId } = req.body; // Note: req.userId is likely better if auth middleware sets it
    // Wait, unfollowUser destructures currentUserId from body? should use req.userId for security if available
    const effectiveUserId = req.userId || currentUserId;

    if (id === effectiveUserId) { // if someone is trying to unfollow themselves
        res.status(403).json({ message: 'Action forbidden: You cannot unfollow yourself' });
    } else {
        try {
            //find both users
            const unfollowUser = await UserModel.findById(id);
            const unfollowingUser = await UserModel.findById(effectiveUserId);

            // Using updateOne with $pull is safer than manual array manipulation + save
            if (unfollowUser.followers.includes(effectiveUserId)) {

                await unfollowUser.updateOne({ $pull: { followers: effectiveUserId } });
                await unfollowingUser.updateOne({ $pull: { following: id } });

                await redisClient.del(`userProfile:${id}`);
                await redisClient.del(`userProfile:${effectiveUserId}`);
                await redisClient.del(`followers:${id}`); // Invalidate target followers cache

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

    await redisClient.del(`userProfile:${req.userId}`);

    res.json(user);
};

//Suggested users
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

// Get Mutual Followers
export const getMutualFollowers = async (req, res) => {
    const userId = req.params.id; // The profile we are viewing
    const currentUserId = req.userId; // Me

    // Key depends on both users
    const cacheKey = `mutual:${userId}:${currentUserId}`;

    try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            return res.status(200).json(JSON.parse(cachedData));
        }

        const viewingProfileUser = await UserModel.findById(userId);
        const currentUser = await UserModel.findById(currentUserId);

        if (!viewingProfileUser || !currentUser) return res.status(404).json({ message: 'User not found' });

        // Intersection of viewingProfileUser.followers and currentUser.following
        // Use MongoDB aggregation or JS filter if lists are small. Assuming small for now or using $in.

        const mutuals = await UserModel.find({
            _id: {
                $in: viewingProfileUser.followers,
                $in: currentUser.following
            }
        }).select('username profilePicture firstname lastname');

        await redisClient.set(cacheKey, JSON.stringify(mutuals), { EX: 3600 });
        res.status(200).json(mutuals);

    } catch (error) {
        res.status(500).json({ message: 'Error fetching mutuals', error: error.message });
    }
};  