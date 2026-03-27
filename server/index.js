import 'dotenv/config';
console.log("Gemini key loaded:", !!process.env.GEMINI_API_KEY);
import http from "http";
import app from "./app.js";
import { initIO } from "./socket/io.js";

const PORT = process.env.PORT || 5002;

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.IO
initIO(httpServer);

// Start server
const server = httpServer.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please close the other process or use a different port.`);
        process.exit(1);
    } else {
        console.error(`❌ Server error:`, err);
    }
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
    console.error(err.stack);
    if (httpServer) {
        httpServer.close(() => {
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});
