import UserModel from "../models/userModel.js";
import { getCache, setCache, deleteCache } from "../services/cacheServices.js";

// Register
export const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(401).json({ message: "All fields are required", success: false });
        }
        const user = await UserModel.create({ username, email, password });
        res.status(201).json({ message: "User registered successfully", success: true });
    } catch (error) {
        res.status(500).json({ message: "Error registering user", error: error.message });
    }
}

// Search Users
export const searchUser = async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ message: "Search query required" });
    try {
        const users = await UserModel.find({
            $or: [
                { username: { $regex: query, $options: "i" } },
                { firstname: { $regex: query, $options: "i" } },
                { lastname: { $regex: query, $options: "i" } }
            ]
        }).select("username firstname lastname profilePicture _id").limit(10);
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Error searching users", error: error.message });
    }
};

// Suggested users (Friends of Friends)
export const suggestedUsers = async (req, res) => {
    try {
        const currentUser = await UserModel.findById(req.userId);
        if (!currentUser) return res.status(404).json({ message: "User not found" });

        const following = currentUser.following || [];

        // Simple algorithm: Users followed by people you follow
        const friendsOfFriends = await UserModel.find({
            _id: { $nin: [...following, req.userId] },
            followers: { $in: following }
        }).select("username profilePicture firstname lastname").limit(10);

        // Fallback to random users if not enough
        let suggestions = [...friendsOfFriends];
        if (suggestions.length < 5) {
            const extra = await UserModel.find({
                _id: { $nin: [...following, ...suggestions.map(u => u._id), req.userId] }
            }).select("username profilePicture firstname lastname").limit(5);
            suggestions = [...suggestions, ...extra];
        }

        res.json(suggestions);
    } catch (error) {
        res.status(500).json({ message: "Error fetching suggestions", error: error.message });
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
        // Prevent sensitive fields from being updated here
        delete updateData.password;
        delete updateData.googleId;
        delete updateData.email; // Email is permanent
        
        // If username is taken, handle gracefully
        if (updateData.username) {
            const existingUser = await UserModel.findOne({
                username: updateData.username,
                _id: { $ne: req.params.id }
            });
            if (existingUser) {
                return res.status(400).json({ message: "Username already taken" });
            }
        }

        // If files uploaded, update respective fields
        if (req.files) {
            if (req.files.profileImage) {
                updateData.profilePicture = req.files.profileImage[0].filename;
            }
            if (req.files.coverImage) {
                updateData.coverPicture = req.files.coverImage[0].filename;
            }
        }

        // Handle nested privacy settings update if provided
        if (req.body.privacySettings) {
             const privacy = typeof req.body.privacySettings === 'string' 
                ? JSON.parse(req.body.privacySettings) 
                : req.body.privacySettings;
             
             // Mongoose findByIdAndUpdate with { $set: { 'privacySettings.messaging': ... } } 
             // is often safer for nested fields, but let's just merge it into updateData for now 
             // if the frontend sends the whole object or we handle it in the model save.
             // Actually, the most robust way is dot notation:
             Object.keys(privacy).forEach(key => {
                 updateData[`privacySettings.${key}`] = privacy[key];
             });
             delete updateData.privacySettings;
        }

        const updatedUser = await UserModel.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        ).select('-password');

        await deleteCache(`userProfile:${req.params.id}`);
        res.json({ message: 'User profile updated successfully', user: updatedUser });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
}

// Change Password
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.userId;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Both current and new passwords are required' });
        }

        const user = await UserModel.findById(userId).select('+password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.googleId && !user.password) {
             return res.status(400).json({ message: 'Users registered with Google cannot change password here.' });
        }

        const bcrypt = await import('bcryptjs');
        const isMatch = await bcrypt.default.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid current password' });

        const salt = await bcrypt.default.genSalt(10);
        const hashedPassword = await bcrypt.default.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error changing password', error: error.message });
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

            // Check if user is private
            if (followUser.isPrivate) {
                // Private: Send Request
                await followUser.updateOne({ $push: { followRequests: currentUserId } });

                // Create Notification
                const NotificationModel = (await import("../models/NotificationModel.js")).default;
                await NotificationModel.create({
                    recipientId: id,
                    senderId: currentUserId,
                    type: 'follow_request'
                });

                res.status(200).json({ message: 'Follow request sent successfully' });
            } else {
                // Public: Direct Follow
                await followUser.updateOne({ $push: { followers: currentUserId } });
                await followingUser.updateOne({ $push: { following: id } });

                // Create Notification
                const NotificationModel = (await import("../models/NotificationModel.js")).default;
                await NotificationModel.create({
                    recipientId: id,
                    senderId: currentUserId,
                    type: 'follow'
                });

                // Invalidate caches
                await deleteCache(`userProfile:${id}`);
                await deleteCache(`userProfile:${currentUserId}`);
                await deleteCache(`followers:${id}`);
                await deleteCache(`following:${currentUserId}`);

                res.status(200).json({ message: 'User followed successfully' });
            }

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

                await deleteCache(`userProfile:${id}`);
                await deleteCache(`userProfile:${currentUserId}`);
                await deleteCache(`followers:${id}`);
                await deleteCache(`following:${currentUserId}`);

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

        await deleteCache(`userProfile:${req.userId}`);
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};

// Get Followers List
export const getFollowers = async (req, res) => {
    const userId = req.params.id;
    const currentUserId = req.userId;
    const cacheKey = `followers:${userId}`;

    try {
        const user = await UserModel.findById(userId).populate('followers', 'username profilePicture firstname lastname');
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Privacy Check
        const isOwner = userId === currentUserId;
        const isFollowing = user.followers.some(f => f._id.toString() === currentUserId);

        if (user.isPrivate && !isOwner && !isFollowing) {
            return res.status(403).json({ message: 'This account is private' });
        }

        if (user.hideFollowers && !isOwner) {
            return res.status(403).json({ message: 'Followers list is hidden by the user' });
        }

        const cachedFn = await getCache(cacheKey);
        if (cachedFn) {
            return res.status(200).json(cachedFn);
        }

        const followers = user.followers;
        await setCache(cacheKey, followers, 3600);

        res.status(200).json(followers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching followers', error: error.message });
    }
};

// Get Following List
export const getFollowing = async (req, res) => {
    const userId = req.params.id;
    const currentUserId = req.userId;
    const cacheKey = `following:${userId}`;

    try {
        const user = await UserModel.findById(userId).populate('following', 'username profilePicture firstname lastname');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const userWithFollowers = await UserModel.findById(userId).select('followers isPrivate hideFollowing');
        const isFollowing = userWithFollowers.followers.includes(currentUserId);
        const isOwner = userId === currentUserId;

        if (userWithFollowers.isPrivate && !isOwner && !isFollowing) {
            return res.status(403).json({ message: 'This account is private' });
        }

        if (userWithFollowers.hideFollowing && !isOwner) {
            return res.status(403).json({ message: 'Following list is hidden by the user' });
        }

        const cachedFn = await getCache(cacheKey);
        if (cachedFn) {
            return res.status(200).json(cachedFn);
        }

        const following = user.following;
        await setCache(cacheKey, following, 3600);

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
        const cachedData = await getCache(cacheKey);
        if (cachedData) {
            return res.status(200).json(cachedData);
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

        await setCache(cacheKey, properMutuals, 3600);
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
        await deleteCache(`userProfile:${currentUserId}`);
        await deleteCache(`userProfile:${requesterId}`);

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

// Request Verification
export const requestVerification = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId);
        if (user.isVerified) return res.status(400).json({ message: 'User already verified' });
        if (user.verificationStatus === 'pending') return res.status(400).json({ message: 'Verification already pending' });

        user.verificationStatus = 'pending';
        // In a real app, handle document upload here
        await user.save();

        res.status(200).json({ message: 'Verification requested successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error requesting verification' });
    }
};

// Admin: Get Pending Verifications
export const getPendingVerifications = async (req, res) => {
    try {
        console.log(`[AdminRoute] Fetching pending verifications for admin user: ${req.userId}`);
        const users = await UserModel.find({ verificationStatus: 'pending' }).select('username firstname lastname profilePicture email createdAt');
        console.log(`[AdminRoute] Found ${users.length} pending requests.`);
        res.status(200).json(users);
    } catch (error) {
        console.error(`[AdminRoute ERROR]`, error);
        res.status(500).json({ message: 'Error fetching pending verifications' });
    }
};

// Admin: Approve Verification
export const approveVerification = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        user.isVerified = true;
        user.verificationStatus = 'approved';
        await user.save();

        // Create Notification
        const NotificationModel = (await import("../models/NotificationModel.js")).default;
        await NotificationModel.create({
            recipientId: userId,
            senderId: req.userId,
            type: 'system',
            text: 'Your account verification request has been approved! You now have a blue tick.'
        });

        await deleteCache(`userProfile:${userId}`);
        res.status(200).json({ message: 'User verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error approving verification' });
    }
};

// Admin: Reject Verification
export const rejectVerification = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        user.isVerified = false;
        user.verificationStatus = 'rejected';
        await user.save();

        // Create Notification
        const NotificationModel = (await import("../models/NotificationModel.js")).default;
        await NotificationModel.create({
            recipientId: userId,
            senderId: req.userId,
            type: 'system',
            text: 'Your account verification request was rejected. Please ensure you meet all criteria.'
        });

        await deleteCache(`userProfile:${userId}`);
        res.status(200).json({ message: 'User verification rejected' });
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting verification' });
    }
};

// Deactivate Account
export const deactivateAccount = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId);
        user.accountStatus = 'deactivated';
        user.deactivationDate = new Date();
        await user.save();

        res.clearCookie('refreshToken');
        res.status(200).json({ message: 'Account deactivated successfully. Login to reactivate.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deactivating account' });
    }
};

// Delete Account (Schedule)
export const deleteAccount = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId);
        user.accountStatus = 'deleted';
        user.deactivationDate = new Date(); // 30 day grace period logic would be in a cron job
        await user.save();

        res.clearCookie('refreshToken');
        res.status(200).json({ message: 'Account scheduled for deletion in 30 days.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting account' });
    }
};

// Update App Usage Time
export const updateAppUsage = async (req, res) => {
    try {
        const { date, timeSpent } = req.body; // timeSpent in seconds for this sync period
        if (!date || timeSpent == null) {
            return res.status(400).json({ message: 'Date and timeSpent are required' });
        }

        const user = await UserModel.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const existingUsage = user.appUsage.find(usage => usage.date === date);

        if (existingUsage) {
            existingUsage.timeSpent += timeSpent;
        } else {
            user.appUsage.push({ date, timeSpent });
        }

        await user.save();
        res.status(200).json({ message: 'App usage updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating app usage', error: error.message });
    }
};

// Get User Activity (Login Count and App Usage)
export const getUserActivity = async (req, res) => {
    try {
        const user = await UserModel.findById(req.userId).select('loginCount appUsage createdAt');
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({
            loginCount: user.loginCount,
            appUsage: user.appUsage,
            createdAt: user.createdAt
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user activity', error: error.message });
    }
};

// Admin: Get Dashboard Stats
export const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await UserModel.countDocuments();
        const activeUsers = await UserModel.countDocuments({ accountStatus: 'active' });
        const suspendedUsers = await UserModel.countDocuments({ accountStatus: 'suspended' });
        const verifiedUsers = await UserModel.countDocuments({ isVerified: true });
        const pendingVerifications = await UserModel.countDocuments({ verificationStatus: 'pending' });

        // New users today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const newUsersToday = await UserModel.countDocuments({ createdAt: { $gte: startOfToday } });

        // New users this week
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);
        const newUsersThisWeek = await UserModel.countDocuments({ createdAt: { $gte: startOfWeek } });

        res.status(200).json({
            totalUsers,
            activeUsers,
            suspendedUsers,
            verifiedUsers,
            pendingVerifications,
            newUsersToday,
            newUsersThisWeek
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin stats', error: error.message });
    }
};

// Admin: Get All Users (paginated + search)
export const getAdminUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const status = req.query.status || '';

        const filter = {};
        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { firstname: { $regex: search, $options: 'i' } },
                { lastname: { $regex: search, $options: 'i' } }
            ];
        }
        if (status) {
            filter.accountStatus = status;
        }

        const total = await UserModel.countDocuments(filter);
        const users = await UserModel.find(filter)
            .select('username email firstname lastname profilePicture isAdmin isVerified verificationStatus accountStatus createdAt lastLogin loginCount followers following')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        // Map to include follower/following counts
        const usersWithCounts = users.map(u => ({
            _id: u._id,
            username: u.username,
            email: u.email,
            firstname: u.firstname,
            lastname: u.lastname,
            profilePicture: u.profilePicture,
            isAdmin: u.isAdmin,
            isVerified: u.isVerified,
            verificationStatus: u.verificationStatus,
            accountStatus: u.accountStatus,
            createdAt: u.createdAt,
            lastLogin: u.lastLogin,
            loginCount: u.loginCount,
            followersCount: u.followers?.length || 0,
            followingCount: u.following?.length || 0
        }));

        res.status(200).json({
            users: usersWithCounts,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error: error.message });
    }
};

// Admin: Update User Account Status (suspend/activate/ban)
export const updateUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        const { accountStatus } = req.body;

        if (!['active', 'suspended', 'banned'].includes(accountStatus)) {
            return res.status(400).json({ message: 'Invalid status. Use "active", "suspended", or "banned".' });
        }

        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.isAdmin) return res.status(403).json({ message: 'Cannot change status of an admin user' });

        user.accountStatus = accountStatus;
        if (accountStatus === 'active') {
            user.banReason = '';
        }
        await user.save();

        await deleteCache(`userProfile:${userId}`);
        res.status(200).json({ message: `User account status set to "${accountStatus}" successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user status', error: error.message });
    }
};

// Admin: Ban a user
export const banUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { reason } = req.body;

        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.isAdmin) return res.status(403).json({ message: 'Cannot ban an admin user' });

        user.accountStatus = 'banned';
        user.banReason = reason || 'Violation of community guidelines';
        await user.save();

        await deleteCache(`userProfile:${userId}`);
        res.status(200).json({ message: 'User banned successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error banning user', error: error.message });
    }
};

// Admin: Restrict a user
export const restrictUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const { canPost, canComment, canMessage, reason } = req.body;

        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.isAdmin) return res.status(403).json({ message: 'Cannot restrict an admin user' });

        if (canPost !== undefined) user.restrictions.canPost = canPost;
        if (canComment !== undefined) user.restrictions.canComment = canComment;
        if (canMessage !== undefined) user.restrictions.canMessage = canMessage;
        if (reason) user.restrictionReason = reason;

        await user.save();
        await deleteCache(`userProfile:${userId}`);

        res.status(200).json({ message: 'User restrictions updated successfully', restrictions: user.restrictions });
    } catch (error) {
        res.status(500).json({ message: 'Error restricting user', error: error.message });
    }
};

// User blocks another user
export const blockUser = async (req, res) => {
    const idToBlock = req.params.id;
    const currentUserId = req.userId;
    if (idToBlock === currentUserId) return res.status(403).json({ message: "Cannot block yourself" });

    try {
        const currentUser = await UserModel.findById(currentUserId);
        const userToBlock = await UserModel.findById(idToBlock);

        if (!userToBlock) return res.status(404).json({ message: "User to block not found" });

        if (!currentUser.blockedUsers.includes(idToBlock)) {
            await currentUser.updateOne({ $push: { blockedUsers: idToBlock } });
            
            await currentUser.updateOne({ $pull: { following: idToBlock, followers: idToBlock } });
            await userToBlock.updateOne({ $pull: { followers: currentUserId, following: currentUserId } });

            await deleteCache(`userProfile:${currentUserId}`);
            await deleteCache(`userProfile:${idToBlock}`);
            await deleteCache(`followers:${currentUserId}`);
            await deleteCache(`following:${currentUserId}`);
            await deleteCache(`followers:${idToBlock}`);
            await deleteCache(`following:${idToBlock}`);

            res.status(200).json({ message: "User blocked successfully" });
        } else {
            res.status(403).json({ message: "User is already blocked" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error blocking user", error: error.message });
    }
};

// User unblocks another user
export const unblockUser = async (req, res) => {
    const idToUnblock = req.params.id;
    const currentUserId = req.userId;

    try {
        const currentUser = await UserModel.findById(currentUserId);
        
        if (currentUser.blockedUsers.includes(idToUnblock)) {
            await currentUser.updateOne({ $pull: { blockedUsers: idToUnblock } });
            await deleteCache(`userProfile:${currentUserId}`);
            res.status(200).json({ message: "User unblocked successfully" });
        } else {
            res.status(403).json({ message: "User is not blocked" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error unblocking user", error: error.message });
    }
};

// User restricts another user (user-level restrict)
export const restrictUserInteraction = async (req, res) => {
    const idToRestrict = req.params.id;
    const currentUserId = req.userId;
    if (idToRestrict === currentUserId) return res.status(403).json({ message: "Cannot restrict yourself" });

    try {
        const currentUser = await UserModel.findById(currentUserId);
        
        if (!currentUser.restrictedUsers.includes(idToRestrict)) {
            await currentUser.updateOne({ $push: { restrictedUsers: idToRestrict } });
            await deleteCache(`userProfile:${currentUserId}`);
            res.status(200).json({ message: "User restricted successfully" });
        } else {
            res.status(403).json({ message: "User is already restricted" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error restricting user", error: error.message });
    }
};

// User unrestricts another user
export const unrestrictUserInteraction = async (req, res) => {
    const idToUnrestrict = req.params.id;
    const currentUserId = req.userId;

    try {
        const currentUser = await UserModel.findById(currentUserId);
        
        if (currentUser.restrictedUsers.includes(idToUnrestrict)) {
            await currentUser.updateOne({ $pull: { restrictedUsers: idToUnrestrict } });
            await deleteCache(`userProfile:${currentUserId}`);
            res.status(200).json({ message: "User unrestricted successfully" });
        } else {
            res.status(403).json({ message: "User is not restricted" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error unrestricting user", error: error.message });
    }
};