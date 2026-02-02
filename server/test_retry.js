
import { checkImageSafety } from './utils/geminiModeration.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
    console.log("Starting test (this might take 20s if rate limited)...");
    const imagePath = path.join(__dirname, 'public', 'images', 'test_image.jpg');
    // Creating a dummy image if not exists, or just skipping if no file.
    // Actually let's just use checkPostSafety since it uses the same retry logic and is easier to test without a file

    try {
        const { checkPostSafety } = await import('./utils/geminiModeration.js');
        console.log("Checking text safety...");
        const result = await checkPostSafety("This is a safe test post.");
        console.log("RESULT:", result);
    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
