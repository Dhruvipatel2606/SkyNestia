import dotenv from "dotenv";
dotenv.config();

console.log("Gemini key loaded:", !!process.env.GEMINI_API_KEY);
import http from "http";
import app from "./app.js";
import { initIO } from "./socket/io.js";

const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.IO
initIO(httpServer);

// Start server
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 logging error but keeping server alive...');
    console.error(err.name, err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 logging error but keeping server alive...');
    console.error(err.name, err.message);
    console.error(err.stack);
});
