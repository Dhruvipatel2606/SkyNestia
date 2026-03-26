import HighlightModel from "../models/HighlightModel.js";

export const createHighlight = async (req, res) => {
    try {
        const { title, stories, coverImage } = req.body;
        const userId = req.userId;

        const highlight = await HighlightModel.create({
            userId,
            title,
            stories,
            coverImage: coverImage || ""
        });

        res.status(201).json({ message: "Highlight created", highlight });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getUserHighlights = async (req, res) => {
    try {
        const { userId } = req.params;
        const highlights = await HighlightModel.find({ userId })
            .populate('stories')
            .sort({ createdAt: -1 });

        res.status(200).json(highlights);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateHighlight = async (req, res) => {
    try {
        const { highlightId } = req.params;
        const { title, stories, coverImage } = req.body;

        const highlight = await HighlightModel.findByIdAndUpdate(
            highlightId,
            { title, stories, coverImage },
            { new: true }
        );

        res.status(200).json(highlight);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteHighlight = async (req, res) => {
    try {
        const { highlightId } = req.params;
        await HighlightModel.findByIdAndDelete(highlightId);
        res.status(200).json({ message: "Highlight deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
