import jwt from 'jsonwebtoken';
import UserModel from '../models/userModel.js';

// Protect routes for Admin users only
const adminMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if user is admin
        const user = await UserModel.findById(decoded.id);
        if (!user || user.isAdmin !== true) {
            return res.status(403).json({ message: 'Access denied: Admin privileges required' });
        }

        req.userId = decoded.id;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        res.status(401).json({ message: 'Invalid token', error: error.message });
    }
};

export default adminMiddleware;
