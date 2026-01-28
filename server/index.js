import dotenv from "dotenv";
// Load environment variables
dotenv.config();
console.log("GEMINI KEY:", process.env.GEMINI_API_KEY); // TEMP CHECK
import http from "http";
import { Server } from "socket.io";
import app from "./app.js";


const PORT = process.env.PORT || 5000;



// Create HTTP server
const httpServer = http.createServer(app);

// Attach Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: "*",
    },
});

let activeUsers = [];

io.on("connection", (socket) => {
    // add new User
    socket.on("new-user-add", (newUserId) => {
        // if user is not added previously
        if (!activeUsers.some((user) => user.userId === newUserId)) {
            activeUsers.push({
                userId: newUserId,
                socketId: socket.id,
            });
        }
        io.emit("get-users", activeUsers);
    });

    // send message
    socket.on("send-message", (data) => {
        const { receiverId } = data;
        const user = activeUsers.find((u) => u.userId === receiverId);
        if (user) {
            io.to(user.socketId).emit("receive-message", data);
        }
    });

    socket.on("disconnect", () => {
        activeUsers = activeUsers.filter(
            (user) => user.socketId !== socket.id
        );
        io.emit("get-users", activeUsers);
    });
});

// Start server
httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
