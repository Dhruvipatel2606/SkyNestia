/**
 * Mock SMS Utility
 * 
 * In a real production environment, integrate Twilio, AWS SNS, or Vonage here.
 * For development, this logs the OTP to the server console.
 */
const sendSMS = async ({ to, message }) => {
    try {
        console.log(`\n--- [MOCK SMS START] ---`);
        console.log(`TO: ${to}`);
        console.log(`MESSAGE: ${message}`);
        console.log(`--- [MOCK SMS END] ---\n`);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        return { success: true, messageId: 'MOCK_' + Date.now() };
    } catch (error) {
        console.error("Error sending mock SMS: ", error);
        throw new Error("SMS could not be sent");
    }
};

export default sendSMS;
