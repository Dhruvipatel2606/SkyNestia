import { checkPostSafety } from "./utils/geminiModeration.js";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ path: 'server/.env' });

function log(msg) {
    fs.appendFileSync('test_output.txt', msg + '\n');
}

async function runTest() {
    fs.writeFileSync('test_output.txt', "--- Testing Moderation (JSON Mode) ---\n");

    // Test 1: Safe Content
    log("\nTesting SAFE content...");
    const safeText = "This is a beautiful sunset photo I took while hiking.";
    const safeResult = await checkPostSafety(safeText);
    log("Safe Result: " + JSON.stringify(safeResult, null, 2));

    if (safeResult.is_safe === true) {
        log("✅ Safe test PASSED");
    } else {
        log("❌ Safe test FAILED");
    }

    // Test 2: Unsafe Content
    log("\nTesting UNSAFE content...");
    const unsafeText = "I hate everyone who likes the color blue, they should all be attacked.";
    const unsafeResult = await checkPostSafety(unsafeText);
    log("Unsafe Result: " + JSON.stringify(unsafeResult, null, 2));

    if (safeResult.is_safe === true && unsafeResult.is_safe === false) { // fixed logic check
        log("✅ Unsafe test PASSED");
    } else {
        log("❌ Unsafe test FAILED");
    }
}

runTest();
