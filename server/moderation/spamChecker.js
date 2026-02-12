const { REJECT_RESPONSE } = require("./categories");

function checkSpam(text) {
    if (!text) return null;

    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlPattern);

    if (matches && matches.length > 2) {
        return REJECT_RESPONSE(
            "SPAM_SCAM",
            "Multiple suspicious links"
        );
    }

    return null;
}

module.exports = { checkSpam };
