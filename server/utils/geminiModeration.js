import { getGenAI, SYSTEM_PROMPT, retryWithBackoff } from './geminiBase.js';
import { getIO, getSocketByUserId } from '../socket/io.js';
import fs from 'fs';
import path from 'path';

// Re-export for convenience
export { getGenAI, SYSTEM_PROMPT };

export const DEFAULT_SAFE_RESPONSE = {
    action: "APPROVE",
    category: "none",
    confidence_score: 1.0,
    reasoning_brief: "Moderation check failed (Fail Open)",
    delete_immediately: false
};

const extractJSON = (text) => {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(text);
    } catch (err) {
        console.error("Failed to parse JSON from:", text);
        return null;
    }
}

export const parseModerationResponse = (res) => {
    try {
        if (!res || !res.response) {
            throw new Error("Invalid response from Gemini");
        }

        const response = res.response;

        if (response.promptFeedback && response.promptFeedback.blockReason) {
            return {
                action: "REJECT",
                category: "PROMPT_BLOCK",
                confidence_score: 1.0,
                reasoning_brief: `Prompt blocked: ${response.promptFeedback.blockReason}`,
                delete_immediately: true
            };
        }

        const candidate = response.candidates?.[0];
        if (candidate) {
            if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'OTHER') {
                return {
                    action: "REJECT",
                    category: "PLATFORM_SAFETY_BLOCK",
                    confidence_score: 1.0,
                    reasoning_brief: "Content was automatically blocked by Gemini safety filters.",
                    delete_immediately: true
                };
            }
        }

        const text = response.text();
        const parsed = extractJSON(text);
        return parsed || DEFAULT_SAFE_RESPONSE;
    } catch (err) {
        console.error("[Moderation] Parse Error:", err.message);
        return DEFAULT_SAFE_RESPONSE;
    }
}

/**
 * Synchronous Behavior Check - Directly calls Gemini
 */
export async function checkPostBehaviorSync(userId, text, imagePaths) {
    console.log(`[Moderation] Starting sync behavior check for user ${userId}`);

    try {
        const model = getGenAI().getGenerativeModel({
            model: "gemini-flash-latest",
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ]
        });

        // Perform the behavior check (Optimized: ONE Multi-modal call)
        const auditResult = await retryWithBackoff(async () => {
            const parts = [];

            // 1. Add Text Prompt
            const fullPrompt = `${SYSTEM_PROMPT}\n\nPerform a behavior check on this content. Ignore innocent context. If safe, return APPROVE.`;
            if (text && text.trim().length > 0) {
                parts.push({ text: `User Caption: "${text}"` });
            }
            parts.push({ text: fullPrompt });

            // 2. Add All Images
            if (imagePaths && imagePaths.length > 0) {
                for (const relPath of imagePaths) {
                    const fullPath = path.join(process.cwd(), 'public', relPath);
                    if (fs.existsSync(fullPath)) {
                        const imageData = fs.readFileSync(fullPath).toString("base64");
                        parts.push({ inlineData: { data: imageData, mimeType: "image/jpeg" } });
                    }
                }
            }

            // Execute Single Call
            const res = await model.generateContent(parts);
            const parsed = parseModerationResponse(res);

            console.log("\n====== [BEHAVIOR CHECK RESPONSE] ======");
            console.log(JSON.stringify(parsed, null, 2));
            console.log("=======================================\n");

            if (parsed.action === 'REJECT') return { action: 'REJECT', category: parsed.category, details: parsed };
            return { action: 'APPROVE', details: parsed };
        });

        return auditResult;

    } catch (err) {
        console.error("[Sync Moderation] Failed:", err.message);
        return { action: 'APPROVE', details: DEFAULT_SAFE_RESPONSE }; // Fail safe
    }
}

/**
 * Background Caption Generation - Fires asynchronous task without waiting
 */
export async function generateAICaptionBackground(userId, image, mimeType, prompt) {
    console.log(`[AI Caption] Triggering background generation for user ${userId}`);

    // Non-blocking execution
    (async () => {

        try {
            const io = getIO();
            // Socket ID no longer needed

            const model = getGenAI().getGenerativeModel({
                model: "gemini-flash-latest",
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ]
            });

            const result = await retryWithBackoff(async () => {
                const parts = [];
                if (image) parts.push({ inlineData: { data: image, mimeType: mimeType || "image/jpeg" } });
                parts.push(prompt || "Generate a creative caption.");
                return await model.generateContent(parts);
            });

            const caption = result.response.text().replace(/\n/g, ' ').trim();

            if (io) {
                // Emit to the user's room (works for all active tabs/devices)
                io.to(userId).emit('caption-generated', { caption });
                console.log(`[AI Caption] Generated and sent to user room ${userId}`);
            } else {
                console.log(`[AI Caption] Generated but IO instance not found.`);
            }
        } catch (err) {
            console.error("[AI Caption] Generation Failed:", err.message);
            // Optionally emit error to user
            const io = getIO();
            const socketId = getSocketByUserId(userId);
            if (io && socketId) {
                io.to(socketId).emit('caption-error', { message: "Failed to generate caption" });
            }
        }
    })();
}

// Deprecated or Unused functions can be removed or kept as dummies if references exist
export async function moderatePostBackground(postId, userId, text, imagePaths) {
    console.warn("moderatePostBackground is deprecated and no-op");
}

export async function generateAICaption(image, mimeType, prompt) {
    // similar logic if needed, but generateAICaptionBackground covers the main use case
    console.warn("generateAICaption synchronous is deprecated");
    return "Caption generation is now background-only";
}
