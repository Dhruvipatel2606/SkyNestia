import React, { useEffect, useState, useRef } from "react";
import { addMessage, getMessages } from "../../api/MessageRequests";
import { getUser } from "../../api/UserRequests";
import API from "../../api.js";
import "./Chat.css";
import { useSocket } from "../../SocketContext"; // Import hook
import { importKey, deriveSharedKey, encryptMessage, decryptMessage } from '../../utils/Encryption';
import { FiArrowLeft } from 'react-icons/fi';

const ChatBox = ({ chat, currentUser, setSendMessage, receiveMessage, setChat }) => {
    const socket = useSocket(); // Use global socket
    const [userData, setUserData] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [sharedKey, setSharedKey] = useState(null);
    const [isTyping, setIsTyping] = useState(false); // Typing state
    const scroll = useRef();

    // Fetching data for header and setting up Encryption
    useEffect(() => {
        const userId = chat?.members?.find((id) => id !== currentUser);
        if (chat !== null) {
            const getUserData = async () => {
                try {
                    const { data } = await getUser(userId);
                    const user = data.user || data.profile || data;
                    setUserData(user);

                    const myKeysJson = localStorage.getItem('e2ee_keys');
                    if (myKeysJson && user.publicKey) {
                        const { privateKey: myPrivJwk } = JSON.parse(myKeysJson);
                        const myPriv = await importKey(JSON.stringify(myPrivJwk), 'private');
                        const theirPub = await importKey(user.publicKey, 'public');
                        if (myPriv && theirPub) {
                            const secret = await deriveSharedKey(myPriv, theirPub);
                            setSharedKey(secret);
                        }
                    }
                } catch (error) {
                    console.log(error);
                }
            };
            getUserData();
        }
    }, [chat, currentUser]);

    // Fetch Messages
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const { data } = await getMessages(chat._id);
                // Always set raw messages first, then attempt decryption
                // This prevents "flicker" of empty state

                if (sharedKey) {
                    const decryptedPromises = data.map(async (msg) => {
                        try {
                            // If it's valid JSON with iv/data, decrypt it. Otherwise keep original text.
                            const decText = await decryptMessage(sharedKey, msg.text);
                            return { ...msg, text: decText };
                        } catch (e) {
                            return msg;
                        }
                    });
                    const decryptedMsgs = await Promise.all(decryptedPromises);
                    setMessages(decryptedMsgs);
                } else {
                    // Start with raw messages, but mark them as potentially pending decryption
                    setMessages(data);
                }
            } catch (error) {
                console.log(error);
            }
        };
        if (chat !== null) fetchMessages();
    }, [chat, sharedKey]);

    // Receive Message
    useEffect(() => {
        if (receiveMessage !== null && receiveMessage.chatId === chat?._id) {
            const processIncoming = async () => {
                if (sharedKey) {
                    const decText = await decryptMessage(sharedKey, receiveMessage.text);
                    setMessages((prev) => [...prev, { ...receiveMessage, text: decText }]);
                } else {
                    // Temporarily show encrypted/raw, fetchMessages will likely run again when key is ready
                    setMessages((prev) => [...prev, receiveMessage]);
                }
            }
            processIncoming();
        }
    }, [receiveMessage])

    const handleSend = async (e) => {
        e.preventDefault();

        if (!newMessage.trim()) return;

        let messageParams = {
            senderId: currentUser,
            chatId: chat._id,
        };

        if (sharedKey) {
            // Encrypted Mode
            const encryptedText = await encryptMessage(sharedKey, newMessage);
            messageParams.text = encryptedText;
        } else {
            // Fallback Mode (Legacy)
            console.warn("Saving unencrypted message because recipient has no public key.");
            messageParams.text = newMessage;
        }

        const receiverId = chat.members.find((id) => id !== currentUser);
        setSendMessage({ ...messageParams, receiverId });

        try {
            const { data } = await addMessage(messageParams);
            setMessages([...messages, { ...data, text: newMessage }]);
            setNewMessage("");
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        scroll.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages])

    // Typing Listeners
    useEffect(() => {
        if (!socket) return;
        const handleTyping = (data) => {
            if (data.chatId === chat?._id && data.senderId !== currentUser) setIsTyping(true);
        };
        const handleStopTyping = (data) => {
            if (data.chatId === chat?._id && data.senderId !== currentUser) setIsTyping(false);
        };

        socket.on("typing", handleTyping);
        socket.on("stop-typing", handleStopTyping);

        return () => {
            socket.off("typing", handleTyping);
            socket.off("stop-typing", handleStopTyping);
        };
    }, [chat, currentUser, socket]);

    const handleInput = (e) => {
        setNewMessage(e.target.value);

        if (!socket || !chat) return;
        const receiverId = chat.members.find((id) => id !== currentUser);

        socket.emit("typing", { receiverId, senderId: currentUser, chatId: chat._id });

        clearTimeout(window.typingTimer);
        window.typingTimer = setTimeout(() => {
            socket.emit("stop-typing", { receiverId, senderId: currentUser, chatId: chat._id });
        }, 2000);
    };

    const getProfilePic = (user) => {
        if (!user?.profilePicture) return "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
        if (typeof user.profilePicture === 'string' && user.profilePicture.startsWith('http')) return user.profilePicture;
        const picName = typeof user.profilePicture === 'string' ? user.profilePicture.split('/').pop() : "";
        return `${API.defaults.baseURL.replace('/api', '')}/images/${picName}`;
    };

    return (
        <div className="chatWindow">
            {chat ? (
                <>

                    <div className="chat-header">
                        <div className="follower">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {/* Back Button for Mobile */}
                                <div
                                    className="back-arrow-chat"
                                    onClick={() => setChat(null)}
                                    style={{ cursor: 'pointer', marginRight: '5px' }} // Controlled by CSS
                                >
                                    <FiArrowLeft size={24} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <img
                                        src={getProfilePic(userData)}
                                        alt=""
                                        className="followerImage"
                                        style={{ width: "50px", height: "50px", borderRadius: "50%" }}
                                    />
                                    <div className="name" style={{ fontSize: "0.9rem", display: 'flex', flexDirection: 'column' }}>
                                        <span>
                                            {userData?.firstname || userData?.username} {userData?.lastname || ""}
                                        </span>
                                        {isTyping && <span style={{ fontSize: "0.7rem", color: "#0095f6" }}>Typing...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="chat-body">
                        {messages.map((message) => (
                            <div
                                ref={scroll}
                                className={
                                    message.senderId === currentUser ? "message own" : "message"
                                }
                                key={message._id || Math.random()}
                            >
                                <span>{message.text}</span>
                                <span className="time">{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        ))}
                    </div>
                    <div className="chat-sender">
                        <input value={newMessage} onChange={handleInput} className="chat-input" placeholder="Type a message... (E2EE)" />
                        <button className="send-button" onClick={handleSend}>Send</button>
                    </div>
                </>
            ) : (
                <div className="chatEmpty">
                    Select a conversation to start chatting...
                </div>
            )}
        </div>
    );
};

export default ChatBox;
