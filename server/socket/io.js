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
            console.log(`User ${newUserId} joined their unique room`);
            io.emit("get-users", activeUsers);
        });

        // ───── Messaging ─────
        socket.on("send-message", (data) => {
            const { receiverId } = data;
            console.log(`Global relay message to room: ${receiverId}`);
            // Use io.to() to ensure the message is delivered via the main server instance to all sockets in the room
            io.to(receiverId).emit("receive-message", data);
        });

        socket.on("typing", (data) => {
            const { receiverId } = data;
            console.log(`Global typing broadcast to room: ${receiverId}`);
            io.to(receiverId).emit("typing", data);
        });

        socket.on("stop-typing", (data) => {
            const { receiverId } = data;
            io.to(receiverId).emit("stop-typing", data);
        });

        socket.on("message-read", (data) => {
            const { senderId } = data;
            const user = activeUsers.find((u) => u.userId === senderId);
            if (user) {
                io.to(user.socketId).emit("message-read", data);
            }
        });

        socket.on("delete-message", (data) => {
            const { receiverId } = data;
            io.to(receiverId).emit("delete-message", data);
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

        // ───── Real-Time Feed Updates ─────
        socket.on("post-liked", (data) => {
            // data: { postId, userId, likesCount, isLiked }
            socket.broadcast.emit("post-liked", data);
        });

        socket.on("post-commented", (data) => {
            // data: { postId, comment }
            socket.broadcast.emit("post-commented", data);
        });

        socket.on("new-post", (data) => {
            // data: { post }
            socket.broadcast.emit("new-post", data);
        });

        socket.on("post-deleted", (data) => {
            // data: { postId }
            socket.broadcast.emit("post-deleted", data);
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
