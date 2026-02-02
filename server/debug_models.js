import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config({ path: 'server/.env' });

function log(msg) {
    fs.appendFileSync('debug_models_output.txt', msg + '\n');
    console.log(msg);
}

async function listModels() {
    fs.writeFileSync('debug_models_output.txt', "--- Debugging Models ---\n");
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        log("No API key found.");
        return;
    }
    const genAI = new GoogleGenerativeAI(key);

    log("Checking API Key validity and Model availability...");

    // Testing multiple variations
    const models = [
        "gemini-1.5-flash",
        "models/gemini-1.5-flash",
        "gemini-pro",
        "gemini-2.0-flash-lite-001"
    ];

    for (const modelId of models) {
        log(`\nTesting ${modelId}...`);
        try {
            const model = genAI.getGenerativeModel({ model: modelId });
            const result = await model.generateContent("Test");
            log(`SUCCESS: ${modelId} is working.`);
        } catch (e) {
            log(`FAILED: ${modelId} - ${e.message}`);
        }
    }
}

listModels();
