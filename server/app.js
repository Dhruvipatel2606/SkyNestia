import dotenv from "dotenv";
// Load environment variables
dotenv.config();
console.log("GEMINI KEY:", process.env.GEMINI_API_KEY); // TEMP CHECK
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import { connectDB } from './config/mongodb.js';
import "./config/redis.js";
import AuthRoute from './routes/AuthRoute.js';
import UserRoute from './routes/UserRoute.js';
import PostRoute from './routes/PostRoute.js';
import FeedRoute from './routes/FeedRoute.js';
import ChatRoute from './routes/ChatRoute.js';
import MessageRoute from './routes/MessageRoute.js';
import CommentRoute from './routes/CommentRoute.js';


const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(bodyParser.json({ limit: '30mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '30mb', extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static('public'));
app.use('/images', express.static('images'));

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

// Singular aliases for client compatibility
app.use("/api/post", PostRoute);

export default app;
