import nodemailer from 'nodemailer';

const sendEmail = async ({ to, subject, text }) => {
    try {
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
        };

        const result = await transporter.sendMail(mailOptions);
        return result;
    } catch (error) {
        console.error("Error sending email: ", error);
        throw new Error("Email could not be sent");
    }
};

export default sendEmail;
