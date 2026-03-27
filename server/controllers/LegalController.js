export const getPrivacyPolicy = (req, res) => {
    const policy = {
        title: "Privacy Policy",
        lastUpdated: "March 2026",
        sections: [
            {
                heading: "1. Information We Collect",
                content: "We collect information you provide directly to us when you create an account, such as your username, email address, profile picture, and E2EE public keys. We also collect content you post, likes, and interactions."
            },
            {
                heading: "2. How We Use Information",
                content: "We use the information to provide, maintain, and improve our services, including personalizing your feed, facilitating communication between users, and ensuring account security."
            },
            {
                heading: "3. Data Security",
                content: "SkyNestia uses industry-standard encryption and security measures. Your private messages are protected with End-to-End Encryption (E2EE), meaning only you and the recipient can read them."
            },
            {
                heading: "4. Your Choices",
                content: "You can update your account information and privacy settings at any time in the Settings dashboard. You also have the right to deactivate or delete your account permanently."
            }
        ]
    };
    res.status(200).json(policy);
};

export const getTerms = (req, res) => {
    const terms = {
        title: "Terms and Conditions",
        lastUpdated: "March 2026",
        sections: [
            {
                heading: "1. Acceptance of Terms",
                content: "By creating an account or using SkyNestia, you agree to be bound by these Terms and Conditions and our Community Guidelines."
            },
            {
                heading: "2. User Content",
                content: "You retain ownership of the content you post on SkyNestia. However, by posting content, you grant us a non-exclusive, royalty-free, worldwide license to use, display, and distribute that content."
            },
            {
                heading: "3. Prohibited Conduct",
                content: "You agree not to engage in any behavior that violates our Community Guidelines, including harassment, spamming, or posting illegal content."
            },
            {
                heading: "4. Termination",
                content: "We reserve the right to suspend or terminate your account if you violate our terms or guidelines."
            }
        ]
    };
    res.status(200).json(terms);
};

export const getCookiePolicy = (req, res) => {
    const policy = {
        title: "Cookie Policy",
        lastUpdated: "March 2026",
        sections: [
            {
                heading: "1. What are Cookies?",
                content: "Cookies are small text files stored on your device that help us recognize you and remember your preferences."
            },
            {
                heading: "2. How We Use Cookies",
                content: "We use essential cookies for authentication and session management. We also use preference cookies to remember your theme selection (Dark/Light mode)."
            },
            {
                heading: "3. Managing Cookies",
                content: "Most web browsers allow you to control cookies through their settings. However, disabling essential cookies may prevent you from using some features of SkyNestia."
            }
        ]
    };
    res.status(200).json(policy);
};

export const getCommunityStandards = (req, res) => {
    const standards = {
        title: "Community Standards",
        lastUpdated: "March 2026",
        sections: [
            {
                heading: "1. Safety First",
                content: "We prioritize the safety of our users. Any content that promotes self-harm, violence, or illegal activities will be removed immediately."
            },
            {
                heading: "2. Respect and Authenticity",
                content: "Be respectful to others. Harassment, hate speech, and bullying have no place on SkyNestia. Use your real identity or a consistent pseudonym."
            },
            {
                heading: "3. Intellectual Property",
                content: "Only post content that you own or have the right to share. Respect the copyright and trademarks of others."
            },
            {
                heading: "4. Spam and Deception",
                content: "Do not use SkyNestia to send spam, conduct scams, or mislead users for commercial or malicious purposes."
            }
        ]
    };
    res.status(200).json(standards);
};
