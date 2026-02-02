import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config({ path: 'server/.env' });

function log(msg) {
    fs.appendFileSync('gemini_test_output.txt', msg + '\n');
    console.log(msg);
}

async function testConnection() {
    fs.writeFileSync('gemini_test_output.txt', "--- Testing Gemini Connection ---\n");
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        log("NO KEY FOUND!");
        return;
    }
    log("Key found:" + key.substring(0, 5) + "...");

    const genAI = new GoogleGenerativeAI(key);

    const modelsToTry = ["gemini-2.0-flash-lite-001", "gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-pro", "gemini-1.0-pro"];

    for (const modelName of modelsToTry) {
        log(`\n--- Testing ${modelName} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Say hi");
            log(`✅ SUCCESS with ${modelName}`);
            log("Response: " + result.response.text());
            return; // We found a working one!
        } catch (error) {
            log(`❌ FAILED ${modelName}`);
            log("Error Code: " + error.status);
            log("Error Details: " + error.message);
        }
    }
    log("\nAll models failed.");
}

testConnection();
