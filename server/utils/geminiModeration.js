import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import fs from "fs";

// Lazy initialization
let genAIInstance = null;

// Helper to handle rate limits
export const retryWithBackoff = async (fn, retries = 5, delay = 2000) => {
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
Role: You are an expert Content Safety Auditor for a high-traffic social media platform.

Objective: Analyze the provided image or text to determine if it violates community safety policies. Your primary goal is to protect users from harmful, illegal, or graphic content.

Safety Categories to Audit:
1. VIOLENCE: Graphic injury, weapons used in a threatening manner, or promotion of self-harm.
2. NUDITY: Explicit sexual content, exposed genitals, or highly suggestive non-consensual imagery.
3. HATE_SPEECH: Symbols of hate groups, racist tropes, or dehumanizing imagery targeting protected groups.
4. HARASSMENT: Doxing (revealing private info), targeted bullying, or malicious mockery of individuals.
5. ILLEGAL: Depiction of illegal drugs, regulated goods sales, or criminal acts.

Operational Rules:
- Be strict. If content is borderline, flag it as 'REJECT'.
- Do not provide conversational text.
- Respond ONLY in the following JSON format.

JSON Schema:
{
  "action": "APPROVE" | "REJECT",
  "category": "string (the violation category or 'none')",
  "confidence_score": 0.0 to 1.0,
  "reasoning_brief": "One sentence explanation for the decision",
  "delete_immediately": true | false
}
`;

// Default safe response in case of failure
const DEFAULT_SAFE_RESPONSE = {
    action: "APPROVE",
    category: "none",
    confidence_score: 1.0,
    reasoning_brief: "Moderation check failed (Fail Open)",
    delete_immediately: false
};

export async function checkPostSafety(postText) {
    // gemini-1.5-flash is generally faster and cheaper for this, supports JSON mode
    const model = getGenAI().getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json"
        },
        systemInstruction: SYSTEM_PROMPT
    });

    try {
        const result = await retryWithBackoff(async () => {
            const res = await model.generateContent(`Audit this post for safety compliance. Text content: "${postText}"`);
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
            model: "gemini-2.5-flash",
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
                "Audit this post for safety compliance."
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

