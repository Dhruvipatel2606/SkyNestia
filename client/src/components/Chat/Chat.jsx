import React, { useRef, useState, useEffect, useMemo } from "react";
import "./Chat.css";
import ChatLayout from "./ChatLayout/ChatLayout";
import { userChats } from "../../api/ChatRequests";
import { generateKeyPair, exportKey } from "../../utils/Encryption";
import { updateUser } from "../../api/UserRequests";
import { useSocket } from "../../SocketContext";

const Chat = () => {
    // 1. Use global socket instead of local ref
    const socket = useSocket();

    // ... rest of state
    const [chats, setChats] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [sendMessage, setSendMessage] = useState(null);
    const [receiveMessage, setReceiveMessage] = useState(null);

    const user = useMemo(() => {
        try {
            const sessionUser = sessionStorage.getItem('user');
            const localUser = localStorage.getItem('user');
            return JSON.parse(sessionUser || localUser);
        } catch (e) { return null; }
    }, []);

    const userId = user?._id;

    // 2. Setup socket listeners using the global socket
    useEffect(() => {
        if (!socket || !userId) return;

        // Register user
        socket.emit("new-user-add", userId);

        // Listen for online users
        socket.on("get-users", (users) => {
            setOnlineUsers(users);
        });

        // Listen for incoming messages
        socket.on("receive-message", (data) => {
            setReceiveMessage(data);
        });

        return () => {
            // Clean up specific listeners (do not disconnect global socket)
            socket.off("get-users");
            socket.off("receive-message");
        };
    }, [socket, userId]);

    // 3. Send Message
    useEffect(() => {
        if (sendMessage !== null && socket) {
            socket.emit("send-message", sendMessage);
        }
    }, [sendMessage, socket]);

    // Get Chats
    useEffect(() => {
        const getChats = async () => {
            try {
                const { data } = await userChats(userId);
                setChats(data);
            } catch (error) {
                console.log(error);
            }
        };
        if (userId) getChats();
    }, [userId]);

    // E2EE Key Setup
    useEffect(() => {
        if (!user || !userId) return;
        const setupKeys = async () => {
            let keys = localStorage.getItem('e2ee_keys');
            if (!keys) {
                console.log("Generating E2EE Keys...");
                const keyPair = await generateKeyPair();
                const pubJwk = await exportKey(keyPair.publicKey);
                const privJwk = await exportKey(keyPair.privateKey);

                const keysToStore = { publicKey: JSON.parse(pubJwk), privateKey: JSON.parse(privJwk) };
                localStorage.setItem('e2ee_keys', JSON.stringify(keysToStore));

                await updateUser(userId, { publicKey: pubJwk, _id: userId });
            } else {
                if (!user.publicKey) {
                    console.log("Syncing Public Key to Server...");
                    const { publicKey } = JSON.parse(keys);
                    const pubJwk = JSON.stringify(publicKey);
                    await updateUser(userId, { publicKey: pubJwk, _id: userId });
                }
            }
        }
        setupKeys();
    }, [userId, user]);

    if (!user) return <div className="Chat" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Please Login to Chat</div>;

    return (
        <div className="Chat">
            <ChatLayout
                chats={chats}
                setChats={setChats}
                currentChat={currentChat}
                setCurrentChat={setCurrentChat}
                onlineUsers={onlineUsers}
                currentUser={user}
                sendMessage={sendMessage}
                receiveMessage={receiveMessage}
                setSendMessage={setSendMessage}
            />
        </div>
    );
};

export default Chat;
