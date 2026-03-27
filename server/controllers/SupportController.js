import sendEmail from '../utils/sendEmail.js';

export const contactSupport = async (req, res) => {
    try {
        const { subject, message, category } = req.body;

        if (!subject || !message) {
            return res.status(400).json({ message: 'Subject and message are required' });
        }

        // In a real app, this would send an email to the support team
        // and potentially save a ticket in the database.
        
        const supportEmailContent = `
            New Support Request from User ID: ${req.userId}
            Category: ${category || 'General'}
            Subject: ${subject}
            Message: ${message}
        `;

        await sendEmail({
            to: process.env.SUPPORT_EMAIL || process.env.EMAIL_USER,
            subject: `[Support Request] ${subject}`,
            text: supportEmailContent
        });

        res.status(200).json({ message: 'Support request sent successfully. We will get back to you soon.' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending support request', error: error.message });
    }
};

export const getFAQ = async (req, res) => {
    // Static FAQ for now, could be moved to DB later
    const faqs = [
        {
            question: "How do I change my password?",
            answer: "Go to Settings > Security and look for the 'Change Password' section."
        },
        {
            question: "Is SkyNestia free to use?",
            answer: "Yes, SkyNestia is currently free for all users."
        },
        {
            question: "How can I report a problem?",
            answer: "You can use the 'Report a Problem' form in the Help & Support tab under Settings."
        },
        {
            question: "Can I make my account private?",
            answer: "Yes, navigate to Settings > Privacy and toggle the 'Private Account' switch."
        }
    ];
    res.json(faqs);
};
