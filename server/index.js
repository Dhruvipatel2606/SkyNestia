import dotenv from "dotenv";
dotenv.config();

console.log("Gemini key loaded:", !!process.env.GEMINI_API_KEY);
import http from "http";
import app from "./app.js";
import { initIO } from "./socket/io.js";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

app.get("/", (req, res) => {
    return res.json({ message: "Welcome to the SkyNestia API", success: true });
})

//middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const corsOptions = {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
};

app.use(cors(corsOptions));

const PORT = process.env.PORT || 5001;

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.IO
initIO(httpServer);

// Start server
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    console.error(err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    if (httpServer) {
        httpServer.close(() => {
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});
