import UserModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { OAuth2Client } from 'google-auth-library';
import sendEmail from '../utils/sendEmail.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate Access Token (Short-lived)
const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user._id, username: user.username, isAdmin: user.isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
};

// Generate Refresh Token (Long-lived)
const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user._id },
        process.env.JWT_REFRESH_SECRET || "REFRESH_SECRET_FALLBACK", // Ensure this env var exists
        { expiresIn: '7d' }
    );
};

// Register a new User
export const registerUser = async (req, res) => {
    try {
        const { username, email, password, firstname, lastname, publicKey } = req.body || {};

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const usernameRegex = /^[a-zA-Z0-9._]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ message: 'Invalid username format' });
        }

        const existingUser = await UserModel.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new UserModel({
            username,
            email,
            password: hashedPassword,
            firstname,
            lastname,
            publicKey
        });

        const savedUser = await newUser.save();

        // Generate Tokens
        const accessToken = generateAccessToken(savedUser);
        const refreshToken = generateRefreshToken(savedUser);

        // Save Refresh Token (Hashed in real app recommended, storing plain for now)
        savedUser.refreshToken = refreshToken;
        await savedUser.save();

        // Send Refresh Token as HttpOnly Cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        const userResponse = savedUser.toObject();
        delete userResponse.password;
        delete userResponse.refreshToken;
        delete userResponse.twoFactorSecret;

        res.status(201).json({
            message: 'User registered successfully',
            user: userResponse,
            token: accessToken
        });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
};

// Login User
export const loginUser = async (req, res) => {
    try {
        const { username, email, password, code } = req.body;

        if ((!username && !email) || !password) {
            return res.status(400).json({ message: 'Provide credentials' });
        }

        const user = await UserModel.findOne({
            $or: [{ username }, { email }]
        }).select('+password +twoFactorEnabled +twoFactorSecret +refreshToken');

        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        // 2FA Check
        if (user.twoFactorEnabled) {
            if (!code) {
                return res.status(200).json({
                    message: '2FA required',
                    requires2FA: true,
                    tempToken: jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '5m' }) // Temp token to identify user for 2FA verify
                });
            }

            const verified = speakeasy.totp.verify({
                secret: user.twoFactorSecret,
                encoding: 'base32',
                token: code
            });

            if (!verified) return res.status(400).json({ message: 'Invalid 2FA code' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.refreshToken;
        delete userResponse.twoFactorSecret;

        res.status(200).json({ message: 'Login successful', token: accessToken, user: userResponse });
    } catch (error) {
        res.status(500).json({ message: 'Login error', error: error.message });
    }
};

// Refresh Access Token
export const refreshAccessToken = async (req, res) => {
    try {
        const cookies = req.cookies;
        if (!cookies?.refreshToken) return res.status(401).json({ message: 'No refresh token' });

        const refreshToken = cookies.refreshToken;

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "REFRESH_SECRET_FALLBACK");
        const user = await UserModel.findById(decoded.id).select('+refreshToken');

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        const newAccessToken = generateAccessToken(user);

        res.json({ token: newAccessToken });
    } catch (error) {
        res.status(403).json({ message: 'Expired or invalid refresh token' });
    }
};

// Logout
export const logoutUser = async (req, res) => {
    try {
        const cookies = req.cookies;
        if (!cookies?.refreshToken) return res.status(204).send(); // No content

        const refreshToken = cookies.refreshToken;
        const user = await UserModel.findOne({ refreshToken });

        if (user) {
            user.refreshToken = '';
            await user.save();
        }

        res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Logout error' });
    }
};

// Google OAuth Login
export const googleAuth = async (req, res) => {
    try {
        const { tokenId } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: tokenId,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const { email, name, picture, sub: googleId } = ticket.getPayload();

        let user = await UserModel.findOne({ email });

        if (user) {
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            const password = email + process.env.JWT_SECRET; // Dummy password for OAuth users (not used)
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = await UserModel.create({
                username: email.split('@')[0], // Fallback username
                email,
                password: hashedPassword,
                firstname: name,
                googleId,
                profilePicture: picture,
                isVerified: true // Auto-verify email
            });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshToken = refreshToken;
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.refreshToken;

        res.status(200).json({ result: userResponse, token: accessToken });
    } catch (error) {
        res.status(500).json({ message: 'Google Auth Failed', error: error.message });
    }
};

// Setup 2FA
export const setup2FA = async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({ length: 20 });
        const user = await UserModel.findById(req.userId); // req.userId from middleware

        user.twoFactorSecret = secret.base32;
        await user.save();

        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        res.json({ secret: secret.base32, qrCodeUrl });
    } catch (error) {
        res.status(500).json({ message: 'Error setting up 2FA' });
    }
};

// Verify 2FA Setup
export const verify2FA = async (req, res) => {
    try {
        const { token } = req.body;
        const user = await UserModel.findById(req.userId).select('+twoFactorSecret');

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token
        });

        if (verified) {
            user.twoFactorEnabled = true;
            await user.save();
            res.json({ message: '2FA Enabled Successfully' });
        } else {
            res.status(400).json({ message: 'Invalid Token' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error verifying 2FA' });
    }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: 'Email is required' });

        const user = await UserModel.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Generate 6 digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP to user (expires in 10 minutes)
        user.otp = {
            code: otpCode,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        };
        await user.save();

        // Send Email
        const message = `Your password reset OTP is: ${otpCode}. It expires in 10 minutes.`;
        await sendEmail({
            to: user.email,
            subject: 'SkyNestia Password Reset OTP',
            text: message
        });

        res.status(200).json({ message: 'OTP sent to email successfully' });
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ message: 'Error processing forgot password request' });
    }
};

// Verify OTP
export const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

        const user = await UserModel.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.otp || !user.otp.code) {
            return res.status(400).json({ message: 'No OTP requested for this user' });
        }

        if (user.otp.code !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date() > new Date(user.otp.expiresAt)) {
            user.otp = undefined; // Clear expired OTP
            await user.save();
            return res.status(400).json({ message: 'OTP has expired' });
        }

        res.status(200).json({ message: 'OTP verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying OTP' });
    }
};

// Reset Password
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: 'Email, OTP, and new password are required' });
        }

        const user = await UserModel.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (!user.otp || !user.otp.code) {
            return res.status(400).json({ message: 'No OTP requested for this user' });
        }

        if (user.otp.code !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (new Date() > new Date(user.otp.expiresAt)) {
            user.otp = undefined; // Clear expired OTP
            await user.save();
            return res.status(400).json({ message: 'OTP has expired' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user
        user.password = hashedPassword;
        user.otp = undefined; // Clear OTP after successful reset
        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting password' });
    }
};