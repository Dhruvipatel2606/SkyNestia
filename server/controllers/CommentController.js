import CommentModel from "../models/CommentModel.js";
import postModel from "../models/postModel.js";
import { redisClient } from "../config/redis.js";

export const addComment = async (req, res) => {
    const { postId, userId, text, parentId } = req.body;
    const newComment = new CommentModel({
        postId,
        userId,
        text,
        parentId: parentId || null
    });

    try {
        await newComment.save();
        
        // If it's a top-level comment, push to post's comment array
        if (!parentId) {
            const post = await postModel.findById(postId).populate('userId', 'privacySettings followers');
            if (!post) return res.status(404).json({ message: "Post not found" });

            const owner = post.userId;
            const setting = owner.privacySettings?.commenting || 'everyone';

            if (setting === 'none' && owner._id.toString() !== userId) {
                return res.status(403).json({ message: "Comments are disabled for this post" });
            }

            if (setting === 'followers' && owner._id.toString() !== userId) {
                const isFollowing = owner.followers.some(f => f.toString() === userId);
                if (!isFollowing) {
                    return res.status(403).json({ message: "Only followers can comment on this post" });
                }
            }

            await postModel.findByIdAndUpdate(postId, { $push: { comments: newComment._id } });
        }
        
        // Invalidate cache
        if (redisClient.isReady) {
            try {
                const pathKeys = await redisClient.keys(`feed:*`);
                if (pathKeys.length > 0) await redisClient.del(pathKeys);
            } catch (err) { console.error('[Cache Error]', err.message); }
        }
        
        await newComment.populate('userId', 'username firstname lastname profilePicture');
        res.status(200).json(newComment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const getComments = async (req, res) => {
    const { postId } = req.params;
    try {
        // Fetch all comments for this post
        // We'll organize them on frontend or fetch with a specific structure
        const comments = await CommentModel.find({ postId }).sort({ createdAt: -1 })
            .populate('userId', 'username firstname lastname profilePicture');
        res.status(200).json(comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const deleteComment = async (req, res) => {
    const { commentId } = req.params;
    const userId = req.userId;
    try {
        const comment = await CommentModel.findById(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        // Ensure only owner or post owner (implied) can delete
        if (comment.userId.toString() !== userId) {
            return res.status(403).json({ message: "Action forbidden" });
        }

        await CommentModel.findByIdAndDelete(commentId);
        // Also delete replies if it's a parent
        if (!comment.parentId) {
            await CommentModel.deleteMany({ parentId: commentId });
            await postModel.findByIdAndUpdate(comment.postId, { $pull: { comments: commentId } });
        }
        res.status(200).json({ message: "Comment deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const toggleCommentLike = async (req, res) => {
    const { commentId } = req.params;
    const userId = req.userId;
    try {
        const comment = await CommentModel.findById(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        if (comment.likes.includes(userId)) {
            await comment.updateOne({ $pull: { likes: userId } });
            res.status(200).json({ message: "Unliked", liked: false });
        } else {
            await comment.updateOne({ $addToSet: { likes: userId } });
            res.status(200).json({ message: "Liked", liked: true });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}