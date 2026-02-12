const { checkText } = require("./textApiChecker");
const { checkSpam } = require("./spamChecker");
const { checkPrivacy } = require("./privacyChecker");
const { checkImageSafety } = require("./imageChecker");
const { APPROVE_RESPONSE } = require("./categories");

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

module.exports = { auditPost };
