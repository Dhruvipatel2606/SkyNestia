import React, { useRef, useState, useEffect } from "react";
import Conversation from "./Conversation";
import ChatBox from "./ChatBox";
import "./Chat.css";
import { userChats } from "../../api/ChatRequests";
import { generateKeyPair, exportKey } from "../../utils/Encryption";
import { updateUser } from "../../api/UserRequests";
import { io } from "socket.io-client";

const Chat = () => {
    const socket = useRef();
    const [chats, setChats] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [currentChat, setCurrentChat] = useState(null);
    const [sendMessage, setSendMessage] = useState(null);
    const [receiveMessage, setReceiveMessage] = useState(null);

    const user = JSON.parse(localStorage.getItem('user'));

    // Socket Connection
    useEffect(() => {
        socket.current = io("http://localhost:5000");
        socket.current.emit("new-user-add", user?._id);
        socket.current.on("get-users", (users) => {
            setOnlineUsers(users);
        });
        return () => { socket.current.disconnect(); }
    }, [user]);

    // Send Message
    useEffect(() => {
        if (sendMessage !== null) {
            socket.current.emit("send-message", sendMessage);
        }
    }, [sendMessage]);

    // Receive Message
    useEffect(() => {
        socket.current.on("receive-message", (data) => {
            setReceiveMessage(data);
        });
    }, []);

    // Get Chats
    useEffect(() => {
        const getChats = async () => {
            try {
                const { data } = await userChats(user?._id);
                setChats(data);
            } catch (error) {
                console.log(error);
            }
        };
        if (user?._id) getChats();
    }, [user]);

    // Check Online
    const checkOnlineStatus = (chat) => {
        const chatMember = chat.members.find((member) => member !== user?._id);
        const online = onlineUsers.find((u) => u.userId === chatMember);
        return online ? true : false;
    };

    // E2EE Key Setup
    useEffect(() => {
        if (!user) return;
        const setupKeys = async () => {
            let keys = localStorage.getItem('e2ee_keys');
            if (!keys) {
                console.log("Generating E2EE Keys...");
                const keyPair = await generateKeyPair();
                const pubJwk = await exportKey(keyPair.publicKey);
                const privJwk = await exportKey(keyPair.privateKey);

                const keysToStore = { publicKey: JSON.parse(pubJwk), privateKey: JSON.parse(privJwk) };
                localStorage.setItem('e2ee_keys', JSON.stringify(keysToStore));

                // Update Server
                await updateUser(user._id, { publicKey: pubJwk, _id: user._id });

                // Update local storage user
                const updatedUser = { ...user, publicKey: pubJwk };
                localStorage.setItem('user', JSON.stringify(updatedUser));
            } else {
                if (!user.publicKey) {
                    console.log("Syncing Public Key to Server...");
                    const { publicKey } = JSON.parse(keys);
                    const pubJwk = JSON.stringify(publicKey);
                    await updateUser(user._id, { publicKey: pubJwk, _id: user._id });

                    const updatedUser = { ...user, publicKey: pubJwk };
                    localStorage.setItem('user', JSON.stringify(updatedUser));
                }
            }
        }
        setupKeys();
    }, [user]);

    if (!user) return <div className="Chat" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Please Login to Chat</div>;

    return (
        <div className="Chat">
            <div className="Left-side-chat">
                <div className="Chat-container">
                    <h2>Chats</h2>
                    <div className="Chat-list">
                        {chats.map((chat) => (
                            <div key={chat._id} onClick={() => setCurrentChat(chat)}>
                                <Conversation
                                    data={chat}
                                    currentUserId={user._id}
                                    online={checkOnlineStatus(chat)}
                                />
                            </div>
                        ))}
                        {chats.length === 0 && <span>No chats yet.</span>}
                    </div>
                </div>
            </div>

            <div className="Right-side-chat">
                <ChatBox
                    chat={currentChat}
                    currentUser={user._id}
                    setSendMessage={setSendMessage}
                    receiveMessage={receiveMessage}
                />
            </div>
        </div>
    );
};

export default Chat;
