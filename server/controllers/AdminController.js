import postModel from '../models/postModel.js';
import userModel from '../models/userModel.js';
import ReportModel from '../models/ReportModel.js';
import { redisClient } from '../config/redis.js';
import fs from 'fs';
import path from 'path';

// ───── Post Management ─────

// Admin: Get All Posts (paginated + search)
export const getAdminPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const search = req.query.search || '';
        const flagged = req.query.flagged; // 'true' for flagged-only

        const filter = {};
        if (search) {
            filter.caption = { $regex: search, $options: 'i' };
        }
        if (flagged === 'true') {
            filter.isSafe = false;
        }

        const total = await postModel.countDocuments(filter);
        const posts = await postModel.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('userId', 'username profilePicture firstname lastname')
            .lean();

        // Count reports for each post
        const postIds = posts.map(p => p._id);
        const reportCounts = await ReportModel.aggregate([
            { $match: { targetId: { $in: postIds }, targetType: 'post' } },
            { $group: { _id: '$targetId', count: { $sum: 1 } } }
        ]);
        const reportMap = {};
        reportCounts.forEach(r => { reportMap[r._id.toString()] = r.count; });

        const postsWithMeta = posts.map(p => ({
            ...p,
            reportCount: reportMap[p._id.toString()] || 0,
            likesCount: p.likes?.length || 0,
            commentsCount: p.comments?.length || 0
        }));

        res.status(200).json({
            posts: postsWithMeta,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching posts', error: error.message });
    }
};

// Admin: Delete any post
export const adminDeletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await postModel.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Clean up image files
        const allImages = post.images?.length > 0 ? post.images : (post.image ? [post.image] : []);
        allImages.forEach(imgPath => {
            try {
                const fullPath = path.join('public', imgPath);
                if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
            } catch (e) { /* ignore cleanup errors */ }
        });

        await postModel.findByIdAndDelete(postId);

        // Also resolve any pending reports for this post
        await ReportModel.updateMany(
            { targetId: postId, targetType: 'post', status: 'pending' },
            { status: 'reviewed', reviewedBy: req.userId, reviewedAt: new Date(), adminNote: 'Post deleted by admin' }
        );

        // Clear feed cache
        if (redisClient.isReady) {
            try {
                const keys = await redisClient.keys('feed:*');
                if (keys.length > 0) await redisClient.del(keys);
                console.log('[Cache INVALIDATE] Admin deleted post, cleared feed cache');
            } catch (err) { console.error('[Cache Admin Flush Error]', err.message); }
        }

        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting post', error: error.message });
    }
};

// ───── Reports ─────

// Admin: Get Reports (paginated + filterable)
export const getReports = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const status = req.query.status || '';
        const targetType = req.query.targetType || '';

        const filter = {};
        if (status) filter.status = status;
        if (targetType) filter.targetType = targetType;

        const total = await ReportModel.countDocuments(filter);
        const reports = await ReportModel.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('reporterId', 'username profilePicture')
            .populate('reviewedBy', 'username')
            .lean();

        // Manually populate target info based on type
        const populated = await Promise.all(reports.map(async (report) => {
            if (report.targetType === 'post') {
                const post = await postModel.findById(report.targetId)
                    .select('caption image images userId isSafe')
                    .populate('userId', 'username profilePicture')
                    .lean();
                return { ...report, targetData: post };
            } else {
                const user = await userModel.findById(report.targetId)
                    .select('username profilePicture email accountStatus')
                    .lean();
                return { ...report, targetData: user };
            }
        }));

        res.status(200).json({
            reports: populated,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching reports', error: error.message });
    }
};

// Admin: Review a report
export const reviewReport = async (req, res) => {
    try {
        const reportId = req.params.id;
        const { status, adminNote } = req.body;

        if (!['reviewed', 'dismissed'].includes(status)) {
            return res.status(400).json({ message: 'Status must be "reviewed" or "dismissed"' });
        }

        const report = await ReportModel.findById(reportId);
        if (!report) return res.status(404).json({ message: 'Report not found' });

        report.status = status;
        report.reviewedBy = req.userId;
        report.reviewedAt = new Date();
        if (adminNote) report.adminNote = adminNote;
        await report.save();

        res.status(200).json({ message: `Report ${status} successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Error reviewing report', error: error.message });
    }
};

// ───── Analytics ─────

export const getAnalytics = async (req, res) => {
    try {
        const totalPosts = await postModel.countDocuments();
        const totalUsers = await userModel.countDocuments();
        const totalReports = await ReportModel.countDocuments();
        const pendingReports = await ReportModel.countDocuments({ status: 'pending' });
        const flaggedPosts = await postModel.countDocuments({ isSafe: false });

        // Engagement: total likes and comments across all posts
        const engagement = await postModel.aggregate([
            {
                $group: {
                    _id: null,
                    totalLikes: { $sum: { $size: '$likes' } },
                    totalComments: { $sum: { $size: '$comments' } }
                }
            }
        ]);
        const totalLikes = engagement[0]?.totalLikes || 0;
        const totalComments = engagement[0]?.totalComments || 0;

        // User growth — last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const userGrowth = await userModel.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Posts per day — last 30 days
        const postGrowth = await postModel.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Reports by reason
        const reportsByReason = await ReportModel.aggregate([
            { $group: { _id: '$reason', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.status(200).json({
            totalPosts,
            totalUsers,
            totalReports,
            pendingReports,
            flaggedPosts,
            totalLikes,
            totalComments,
            userGrowth,
            postGrowth,
            reportsByReason
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching analytics', error: error.message });
    }
};
