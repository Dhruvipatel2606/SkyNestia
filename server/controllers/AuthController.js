import UserModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

//user to authenticate middleware
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        // Check if the authorization header is present and starts with "Bearer "
        if (!authHeader || !authHeader.startsWith('Bearer '))
            return res.status(401).json({ message: 'No token provided' });
        // Extract the token from the authorization header
        const token = authHeader.split(' ')[1];
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Find the user by the decoded token
        const user = await UserModel.findById(decoded.id).select('-password');
        // Check if the user exists
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Attach the user to the request object
        req.user = user;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Auth error', error: error.message });
    }
};

// Register a new User
export const registerUser = async (req, res) => {
    try {
        console.log("Register Request Body:", req.body);
        // Guard against undefined req.body
        const { username, email, password, firstname, lastname, publicKey } = req.body || {};

        // Basic validation
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields: username, email, password' });
        }
        // Validate username using expression
        const usernameRegex = /^[a-zA-Z0-9._]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                message: 'Username must be 3-20 characters long and can only contain letters, numbers, underscores, and dots.'
            });
        }

        // salt - It is amount of random data added to the input of a hash function to guarantee a unique output, even for identical inputs.
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new UserModel({ username, email, password: hashedPassword, firstname, lastname, publicKey });

        await newUser.save();
        const userWithoutPassword = newUser.toObject();
        delete userWithoutPassword.password;
        res.status(200).json({ message: 'User registered successfully', user: userWithoutPassword });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
}

// Login User
export const loginUser = async (req, res) => {
    try {
        console.log("Login Request Body:", req.body);
        const { username, email, password } = req.body || {};

        if ((!username && !email) || !password) {
            return res.status(400).json({ message: 'Provide username or email and password' });
        }

        const user = await UserModel.findOne({
            $or: [
                { username: username },
                { email: email }
            ]
        });


        if (!user) {
            return res.status(404).json({ message: 'User does not exist' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        // Remove password from user object
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;

        res.status(200).json({ message: 'Login successful', token, user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
};

export default authMiddleware;