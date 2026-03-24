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
        // ───── User Presence ─────
        socket.on("new-user-add", (newUserId) => {
            if (!activeUsers.some((user) => user.userId === newUserId)) {
                activeUsers.push({
                    userId: newUserId,
                    socketId: socket.id,
                });
            } else {
                // Update socketId if user reconnected
                activeUsers = activeUsers.map(u =>
                    u.userId === newUserId ? { ...u, socketId: socket.id } : u
                );
            }
            socket.join(newUserId);
            console.log(`User ${newUserId} connected`);
            io.emit("get-users", activeUsers);
        });

        // ───── Messaging ─────
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

        // ───── Call Signaling ─────

        // Caller initiates a call
        socket.on("call-user", (data) => {
            // data: { callerId, callerName, callerAvatar, receiverId, callType }
            const { receiverId } = data;
            const user = activeUsers.find((u) => u.userId === receiverId);
            if (user) {
                io.to(user.socketId).emit("incoming-call", {
                    ...data,
                    callerSocketId: socket.id
                });
            } else {
                // Receiver is offline
                socket.emit("call-not-available", { receiverId });
            }
        });

        // Callee accepts the call
        socket.on("call-accepted", (data) => {
            // data: { callerId, receiverId }
            const { callerId } = data;
            const user = activeUsers.find((u) => u.userId === callerId);
            if (user) {
                io.to(user.socketId).emit("call-accepted", data);
            }
        });

        // Callee rejects the call
        socket.on("call-rejected", (data) => {
            // data: { callerId, receiverId }
            const { callerId } = data;
            const user = activeUsers.find((u) => u.userId === callerId);
            if (user) {
                io.to(user.socketId).emit("call-rejected", data);
            }
        });

        // Either party ends the call
        socket.on("call-ended", (data) => {
            // data: { to }
            const { to } = data;
            const user = activeUsers.find((u) => u.userId === to);
            if (user) {
                io.to(user.socketId).emit("call-ended", data);
            }
        });

        // WebRTC SDP Offer
        socket.on("webrtc-offer", (data) => {
            // data: { to, offer }
            const { to } = data;
            const user = activeUsers.find((u) => u.userId === to);
            if (user) {
                io.to(user.socketId).emit("webrtc-offer", { ...data, from: socket.id });
            }
        });

        // WebRTC SDP Answer
        socket.on("webrtc-answer", (data) => {
            // data: { to, answer }
            const { to } = data;
            const user = activeUsers.find((u) => u.userId === to);
            if (user) {
                io.to(user.socketId).emit("webrtc-answer", { ...data, from: socket.id });
            }
        });

        // ICE Candidate relay
        socket.on("ice-candidate", (data) => {
            // data: { to, candidate }
            const { to } = data;
            const user = activeUsers.find((u) => u.userId === to);
            if (user) {
                io.to(user.socketId).emit("ice-candidate", { ...data, from: socket.id });
            }
        });

        // ───── Disconnect ─────
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
