import UserModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { OAuth2Client } from 'google-auth-library';
import sendEmail from '../utils/sendEmail.js';
import SessionModel from '../models/sessionModel.js';
import crypto from 'crypto';

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
        process.env.JWT_REFRESH_SECRET || "REFRESH_SECRET_FALLBACK",
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

        const accessToken = generateAccessToken(savedUser);
        const refreshToken = generateRefreshToken(savedUser);

        savedUser.refreshToken = refreshToken;
        await savedUser.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
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
        }).select('+password +twoFactorEnabled +twoFactorSecret +refreshToken +backupCodes');

        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        // 2FA Check
        if (user.twoFactorEnabled) {
            if (!code) {
                return res.status(200).json({
                    message: '2FA required',
                    requires2FA: true,
                    tempToken: jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '5m' })
                });
            }

            if (code.length > 6) {
                const backupCode = user.backupCodes.find(bc => bc.code === code && !bc.used);
                if (!backupCode) return res.status(400).json({ message: 'Invalid or used backup code' });
                backupCode.used = true;
            } else {
                const verified = speakeasy.totp.verify({
                    secret: user.twoFactorSecret,
                    encoding: 'base32',
                    token: code
                });
                if (!verified) return res.status(400).json({ message: 'Invalid 2FA code' });
            }
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save();

        const userAgent = req.headers['user-agent'] || 'Unknown';
        await SessionModel.create({
            userId: user._id,
            refreshToken,
            ip: req.ip,
            device: {
                browser: userAgent.includes('Chrome') ? 'Chrome' : (userAgent.includes('Firefox') ? 'Firefox' : 'Other'),
                os: userAgent.includes('Windows') ? 'Windows' : (userAgent.includes('Mac') ? 'Mac' : 'Other'),
                userAgent: userAgent
            }
        });

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
        delete userResponse.backupCodes;

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
        if (!cookies?.refreshToken) return res.status(204).send();

        const refreshToken = cookies.refreshToken;
        await SessionModel.findOneAndDelete({ refreshToken });

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
            const password = email + process.env.JWT_SECRET;
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = await UserModel.create({
                username: email.split('@')[0],
                email,
                password: hashedPassword,
                firstname: name,
                googleId,
                profilePicture: picture,
                isVerified: true
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
        const secret = speakeasy.generateSecret({ length: 20, name: `SkyNestia:${req.userId}` });
        const user = await UserModel.findById(req.userId);

        user.twoFactorSecret = secret.base32;
        
        if (!user.backupCodes || user.backupCodes.length === 0) {
            const codes = [];
            for (let i = 0; i < 8; i++) {
                codes.push({ code: crypto.randomBytes(4).toString('hex').toUpperCase(), used: false });
            }
            user.backupCodes = codes;
        }
        
        await user.save();
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        res.json({ 
            secret: secret.base32, 
            qrCodeUrl, 
            backupCodes: user.backupCodes.filter(c => !c.used).map(c => c.code) 
        });
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

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = {
            code: otpCode,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        };
        await user.save();

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

        if (!user.otp || !user.otp.code) return res.status(400).json({ message: 'No OTP requested' });
        if (user.otp.code !== otp) return res.status(400).json({ message: 'Invalid OTP' });
        if (new Date() > new Date(user.otp.expiresAt)) return res.status(400).json({ message: 'OTP expired' });

        res.status(200).json({ message: 'OTP verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying OTP' });
    }
};

// Reset Password
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) return res.status(400).json({ message: 'Missing fields' });

        const user = await UserModel.findOne({ email });
        if (!user || user.otp?.code !== otp) return res.status(400).json({ message: 'Invalid request' });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.otp = undefined;
        await user.save();

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error resetting password' });
    }
};

// --- Session Management ---

export const getSessions = async (req, res) => {
    try {
        const currentRefreshToken = req.cookies.refreshToken;
        const sessions = await SessionModel.find({ userId: req.userId }).sort({ lastActive: -1 });
        
        const sessionsWithCurrent = sessions.map(session => ({
            ...session.toObject(),
            isCurrent: session.refreshToken === currentRefreshToken
        }));

        res.status(200).json(sessionsWithCurrent);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sessions' });
    }
};

export const revokeSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await SessionModel.findById(sessionId);
        
        if (!session) return res.status(404).json({ message: 'Session not found' });
        if (session.userId.toString() !== req.userId) return res.status(403).json({ message: 'Unauthorized' });

        if (session.refreshToken === req.cookies.refreshToken) {
            return res.status(400).json({ message: 'Cannot revoke current session. Use logout instead.' });
        }

        await SessionModel.findByIdAndDelete(sessionId);
        res.status(200).json({ message: 'Session revoked' });
    } catch (error) {
        res.status(500).json({ message: 'Error revoking session' });
    }
};

export const logoutAllDevices = async (req, res) => {
    try {
        await SessionModel.deleteMany({ userId: req.userId });
        await UserModel.findByIdAndUpdate(req.userId, { refreshToken: '' });
        res.clearCookie('refreshToken', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
        res.status(200).json({ message: 'Logged out from all devices' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging out from all devices' });
    }
};