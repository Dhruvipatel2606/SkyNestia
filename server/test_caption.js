import { getGenAI } from "./utils/geminiModeration.js";
import dotenv from "dotenv";

dotenv.config();

async function testCaption() {
    console.log("Testing AI Caption Generation (gemini-2.0-flash)...");
    try {
        const genAI = getGenAI();
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = "Write a creative social media caption about a sunny day at the beach.";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const fs = await import('fs');
        fs.writeFileSync('test_result.log', `--- Generated Caption ---\n${text}\n-------------------------`);
        console.log("Success! Result saved to test_result.log");
    } catch (error) {
        const fs = await import('fs');
        fs.writeFileSync('test_result.log', `Test failed: ${error.message}\n${error.stack}\n${JSON.stringify(error, null, 2)}`);
        console.error("Test failed:", error);
    }
}

testCaption();
