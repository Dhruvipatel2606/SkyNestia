import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Mongoose model directly defined here to run independently 
const userSchema = new mongoose.Schema({
    email: { type: String, required: true },
    username: { type: String, required: true },
    isAdmin: { type: Boolean, default: false }
}, { strict: false }); // strict: false allows us to only define fields we care about

const UserModel = mongoose.model('Users', userSchema);

const makeAdmin = async () => {
    // Get command line arguments
    const email = process.argv[2];

    if (!email) {
        console.error(" Please provide the email address of the account you want to make an admin.");
        console.error("Usage: node makeAdmin.js <user-email>");
        process.exit(1);
    }

    try {
        console.log(`Connecting to database...`);
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/SkyNestia');

        console.log(`Searching for user with email: ${email}...`);

        // Find user by email
        const user = await UserModel.findOne({ email: email });

        if (!user) {
            console.error(` Found no user matching email: ${email}`);
            console.log("Please make sure you have registered your account in the browser first!");
            process.exit(1);
        }

        // Update admin status
        if (user.isAdmin) {
            console.log(` User ${user.username} is already an admin!`);
        } else {
            user.isAdmin = true;
            await user.save();
            console.log(`SUCCESS! Granted admin privileges to ${user.username} (${user.email}).`);
            console.log("You can now access the Admin Panel by logging into this account.");
        }

    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

makeAdmin();
