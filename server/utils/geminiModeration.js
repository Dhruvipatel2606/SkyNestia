import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import fs from "fs";

// Lazy initialization
let genAIInstance = null;

// Helper to handle rate limits
const retryWithBackoff = async (fn, retries = 5, delay = 2000) => {
    try {
        return await fn();
    } catch (error) {
        if (retries === 0 || !error.message.includes('429')) throw error;

        // Extract wait time if available, otherwise use default backoff
        let waitTime = delay;
        const match = error.message.match(/retry in ([\d.]+)s/);
        if (match) {
            waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1000; // Wait requested time + 1s buffer
        }

        console.log(`Rate limit hit. Waiting ${waitTime / 1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return retryWithBackoff(fn, retries - 1, delay * 1.5); // Increase default delay for next time
    }
};

export const getGenAI = () => {
    if (!genAIInstance) {
        if (!process.env.GEMINI_API_KEY) {
            console.error("CRITICAL ERROR: GEMINI_API_KEY is missing from environment variables.");
        }
        genAIInstance = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAIInstance;
};

const SYSTEM_PROMPT = `
Role: You are an expert Social Media Safety Agent.
Task: Analyze the provided content (text or image) for any violations of community safety standards.

Evaluation Criteria:
1. Violence & Incitement: Does it depict physical harm, weapons, or promote illegal acts?
2. Hate Speech: Does it contain symbols, gestures, or text targeting protected groups?
3. Harassment: Does it target a specific individual for mockery or degradation?
4. Sensitive Content: Does it contain nudity, sexual suggestive poses, or graphic injuries?
5. Deceptive Content: Is it a "Deepfake" or AI-generated image meant to mislead?

Output Format:
You must respond in a valid JSON format with the following keys:
* is_safe: (boolean) true if the content is allowed, false if it should be deleted.
* violation_category: (string) "none" or the specific category violated.
* confidence_score: (number 0-1) How sure are you of this judgment?
* action: (string) "approve" or "reject".
`;

// Default safe response in case of failure
const DEFAULT_SAFE_RESPONSE = {
    is_safe: true,
    violation_category: "none",
    confidence_score: 0,
    action: "approve",
    error: "Moderation check failed (Fail Open)"
};

export async function checkPostSafety(postText) {
    // gemini-1.5-flash is generally faster and cheaper for this, supports JSON mode
    const model = getGenAI().getGenerativeModel({
        model: "gemini-2.0-flash-lite-001",
        generationConfig: {
            responseMimeType: "application/json"
        },
        systemInstruction: SYSTEM_PROMPT
    });

    try {
        const result = await retryWithBackoff(async () => {
            const res = await model.generateContent(`Analyze this text:\n"${postText}"`);
            return res.response.text();
        });

        console.log("[Moderation] Text Check Result Raw:", result);
        return JSON.parse(result);

    } catch (err) {
        console.error("[Moderation] Text Check Failed:", err.message);

        try {
            fs.appendFileSync('safety_debug.log', `[Text Check Error] ${err.message}\n${err.stack}\n`);
        } catch (e) { }

        // Fail Open
        return DEFAULT_SAFE_RESPONSE;
    }
}

export async function checkImageSafety(filePath, mimeType) {
    try {
        const model = getGenAI().getGenerativeModel({
            model: "gemini-2.0-flash-lite-001",
            generationConfig: {
                responseMimeType: "application/json"
            },
            systemInstruction: SYSTEM_PROMPT
        });

        const image = fs.readFileSync(filePath).toString("base64");

        const result = await retryWithBackoff(async () => {
            const res = await model.generateContent([
                {
                    inlineData: {
                        data: image,
                        mimeType: mimeType
                    }
                },
                "Analyze this image."
            ]);
            return res.response.text();
        });

        // console.log("[Moderation] Image Result Raw:", result); // Debug only
        return JSON.parse(result);

    } catch (err) {
        // FAIL OPEN STRATEGY
        const isRateLimit = err.message.includes('429') || err.message.includes('Quota');
        console.error(`[Moderation] Image Check Failed (${isRateLimit ? 'RATE LIMIT' : 'ERROR'}):`, err.message);

        if (!isRateLimit) {
            // Log detailed error for debugging non-transient errors
            const logMsg = `[${new Date().toISOString()}] Image Check Failed:\nError: ${err.message}\nStack: ${err.stack}\n\n`;
            try {
                fs.appendFileSync('safety_debug.log', logMsg);
            } catch (e) { }
        }

        return DEFAULT_SAFE_RESPONSE;
    }
}

