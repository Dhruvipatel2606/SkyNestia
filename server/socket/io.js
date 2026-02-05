import { Server } from "socket.io";

let io;
let activeUsers = [];

export const initIO = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*",
        },
    });

    io.on("connection", (socket) => {
        socket.on("new-user-add", (newUserId) => {
            if (!activeUsers.some((user) => user.userId === newUserId)) {
                activeUsers.push({
                    userId: newUserId,
                    socketId: socket.id,
                });
            }
            // Join a room with the userId so we can emit to all of this user's devices
            socket.join(newUserId);
            console.log(`User ${newUserId} connected and joined room ${newUserId}`);
            io.emit("get-users", activeUsers);
        });

        socket.on("send-message", (data) => {
            const { receiverId } = data;
            const user = activeUsers.find((u) => u.userId === receiverId);
            if (user) {
                io.to(user.socketId).emit("receive-message", data);
            }
        });

        socket.on("typing", (data) => {
            const { receiverId } = data;
            const user = activeUsers.find((u) => u.userId === receiverId);
            if (user) {
                io.to(user.socketId).emit("typing", data);
            }
        });

        socket.on("stop-typing", (data) => {
            const { receiverId } = data;
            const user = activeUsers.find((u) => u.userId === receiverId);
            if (user) {
                io.to(user.socketId).emit("stop-typing", data);
            }
        });

        socket.on("disconnect", () => {
            activeUsers = activeUsers.filter((user) => user.socketId !== socket.id);
            io.emit("get-users", activeUsers);
        });
    });

    return io;
};

export const getIO = () => io;

export const getSocketByUserId = (userId) => {
    const user = activeUsers.find(u => u.userId === userId);
    return user ? user.socketId : null;
};
