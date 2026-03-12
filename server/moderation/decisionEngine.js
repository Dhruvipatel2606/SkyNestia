import { checkText } from "./textApiChecker.js";
import { checkSpam } from "./spamChecker.js";
import { checkPrivacy } from "./privacyChecker.js";
import { checkImageSafety } from "./imageChecker.js";
import { APPROVE_RESPONSE } from "./categories.js";

async function auditPost({ text, imagePath }) {

    const textResult = checkText(text);
    if (textResult) return textResult;

    const spamResult = checkSpam(text);
    if (spamResult) return spamResult;

    const privacyResult = checkPrivacy(text);
    if (privacyResult) return privacyResult;

    if (imagePath) {
        const imageResult = await checkImageSafety(imagePath);
        if (imageResult) return imageResult;
    }

    return APPROVE_RESPONSE;
}

export { auditPost };
