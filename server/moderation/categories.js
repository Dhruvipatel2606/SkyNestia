module.exports = {
    REJECT_RESPONSE: (category, reason, score = 0.8) => ({
        action: "REJECT",
        category,
        confidence_score: score,
        reasoning_brief: reason,
        delete_immediately: true,
    }),

    APPROVE_RESPONSE: {
        action: "APPROVE",
        category: "none",
        confidence_score: 0.95,
        reasoning_brief: "No policy violations detected",
        delete_immediately: false,
    }
};
