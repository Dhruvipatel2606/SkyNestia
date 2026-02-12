const { REJECT_RESPONSE } = require("./categories");

function checkPrivacy(text) {
    if (!text) return null;

    const email = /\S+@\S+\.\S+/;
    const phone = /\d{10}/;

    if (email.test(text) || phone.test(text)) {
        return REJECT_RESPONSE(
            "PRIVACY_VIOLATION",
            "Detected personal information"
        );
    }

    return null;
}

module.exports = { checkPrivacy };
