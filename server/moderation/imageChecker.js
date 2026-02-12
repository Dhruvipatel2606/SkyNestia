const { checkImage } = require("../utils/imageModeration");

async function checkImageSafety(imagePath) {
    const unsafe = await checkImage(imagePath);

    if (unsafe) {
        return {
            action: "REJECT",
            category: "NUDITY",
            confidence_score: 0.85,
            reasoning_brief: "Unsafe visual content detected",
            delete_immediately: true,
        };
    }

    return null;
}

module.exports = { checkImageSafety };
