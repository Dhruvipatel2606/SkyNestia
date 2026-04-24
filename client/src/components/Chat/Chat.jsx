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

    // 2. State Management
    const [chats, setChats] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [sendMessage, setSendMessage] = useState(null);
    const [receiveMessage, setReceiveMessage] = useState(null);
    const [e2eeStatus, setE2eeStatus] = useState('ok'); // 'ok' | 'missing_local' | 'no_server_key'

    const user = useMemo(() => {
        try {
            const sessionUser = sessionStorage.getItem('user');
            const localUser = localStorage.getItem('user');
            return JSON.parse(sessionUser || localUser || 'null');
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
            console.log("Online users updated:", users.length);
            setOnlineUsers(users);
        });

        // Listen for incoming messages
        socket.on("receive-message", (data) => {
            console.log("New real-time message received from room");
            
            // Move the chat to the top of the list if it exists
            setChats((prev) => {
                const chatIndex = prev.findIndex(c => c._id === data.chatId);
                if (chatIndex > -1) {
                    const updatedChats = [...prev];
                    const chat = updatedChats.splice(chatIndex, 1)[0];
                    return [chat, ...updatedChats];
                }
                return prev; // If not found, it might be a new chat (should be fetched via API or another event)
            });

            // Add a timestamp to ensure state change triggers even if message content is identical
            setReceiveMessage({ ...data, receivedAt: Date.now() });
        });

        return () => {
            // Clean up specific listeners
            socket.off("get-users");
            socket.off("receive-message");
        };
    }, [socket, userId]);

    // 3. Send Message
    useEffect(() => {
        if (sendMessage !== null && socket) {
            console.log("Emitting send-message through socket");
            socket.emit("send-message", sendMessage);

            // Also move the chat to the top for the sender
            setChats((prev) => {
                const chatIndex = prev.findIndex(c => c._id === sendMessage.chatId);
                if (chatIndex > -1) {
                    const updatedChats = [...prev];
                    const chat = updatedChats.splice(chatIndex, 1)[0];
                    return [chat, ...updatedChats];
                }
                return prev;
            });
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
                // IMPORTANT: Only generate new keys if user has NO public key on server.
                // This prevents overwriting keys when logging in on a new device.
                if (!user.publicKey) {
                    console.log("Generating E2EE Keys for new user...");
                    setE2eeStatus('no_server_key');
                    const keyPair = await generateKeyPair();
                    const pubJwk = await exportKey(keyPair.publicKey);
                    const privJwk = await exportKey(keyPair.privateKey);

                    const keysToStore = { publicKey: JSON.parse(pubJwk), privateKey: JSON.parse(privJwk) };
                    localStorage.setItem('e2ee_keys', JSON.stringify(keysToStore));

                    await updateUser(userId, { publicKey: pubJwk, _id: userId });
                    setE2eeStatus('ok');
                } else {
                    setE2eeStatus('missing_local');
                    console.warn("E2EE keys missing locally but exist on server. Device sync required to read messages.");
                }
            } else {
                setE2eeStatus('ok');
                if (!user.publicKey) {
                    console.log("Syncing existing Public Key to Server...");
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
                e2eeStatus={e2eeStatus}
            />
        </div>
    );
};

export default Chat;
