import express from 'express';
import cors from 'cors';

import { connectDB } from './config/mongodb.js';
import { connectRedis } from './config/redis.js';
import AuthRoute from './routes/AuthRoute.js';
import UserRoute from './routes/UserRoute.js';
import PostRoute from './routes/PostRoute.js';
import FeedRoute from './routes/FeedRoute.js';
import ChatRoute from './routes/ChatRoute.js';
import MessageRoute from './routes/MessageRoute.js';
import CommentRoute from './routes/CommentRoute.js';
import NotificationRoute from './routes/NotificationRoute.js';
import AdminRoute from './routes/AdminRoute.js';
import ReportRoute from './routes/ReportRoute.js';
import StoryRoute from './routes/StoryRoute.js';
import HighlightRoute from './routes/HighlightRoute.js';
import ReelRoute from './routes/ReelRoute.js';

const app = express();

// Connect to MongoDB & Redis
connectDB();
await connectRedis();

// Middleware
const corsOptions = {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));
app.use(express.static('public'));

// Welcome route
app.get("/", (req, res) => {
    return res.json({ message: "Welcome to the SkyNestia API", success: true });
});

// Routes
app.use('/auth', AuthRoute);
app.use('/user', UserRoute);
app.use('/post', PostRoute);
app.use('/feed', FeedRoute);

// API routes
app.use("/api/auth", AuthRoute);
app.use("/api/users", UserRoute);
app.use("/api/posts", PostRoute);
app.use("/api/feed", FeedRoute);
app.use('/api/chat', ChatRoute);
app.use('/api/message', MessageRoute);
app.use('/api/comment', CommentRoute);
app.use('/api/notification', NotificationRoute);
app.use('/api/admin', AdminRoute);
app.use('/api/report', ReportRoute);
app.use('/api/story', StoryRoute);
app.use('/api/highlight', HighlightRoute);
app.use('/api/reels', ReelRoute);

// Singular aliases for client compatibility
app.use("/api/post", PostRoute);
app.use("/api/user", UserRoute);

export default app;
