import CommentModel from "../models/CommentModel.js";

export const addComment = async (req, res) => {
    const { postId, userId, text } = req.body;
    const newComment = new CommentModel({
        postId,
        userId,
        text
    });

    try {
        await newComment.save();
        // Populate the user immediately so the frontend can display it
        await newComment.populate('userId', 'username firstname lastname profilePicture');
        res.status(200).json(newComment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const getComments = async (req, res) => {
    const { postId } = req.params;
    try {
        const comments = await CommentModel.find({ postId }).sort({ createdAt: -1 })
            .populate('userId', 'username firstname lastname profilePicture');
        res.status(200).json(comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const deleteComment = async (req, res) => {
    const { commentId } = req.params;
    try {
        const comment = await CommentModel.findByIdAndDelete(commentId);
        res.status(200).json(comment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}