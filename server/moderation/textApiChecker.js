import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export async function checkText(text) {
    if (!text) return null;

    const response = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: text,
    });

    const result = response.results[0];

    if (result.flagged) {
        return {
            action: "REJECT",
            category: "TEXT_VIOLATION",
            confidence_score: 0.9,
            reasoning_brief: "Text violates safety policy",
            delete_immediately: true,
        };
    }

    return null;
}
