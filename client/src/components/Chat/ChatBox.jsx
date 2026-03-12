import React, { useEffect, useState, useRef, useCallback } from "react";
import { addMessage, getMessages } from "../../api/MessageRequests";
import { getUser } from "../../api/UserRequests";
import API from "../../api.js";
import "./Chat.css";
import { useSocket } from "../../SocketContext";
import { importKey, deriveSharedKey, encryptMessage, decryptMessage } from '../../utils/Encryption';
import { FiArrowLeft, FiVideo, FiPhone } from 'react-icons/fi';
import VideoCall from "./VideoCall";
import IncomingCall from "./IncomingCall";

const ChatBox = ({ chat, currentUser, setSendMessage, receiveMessage, setChat, onlineUsers }) => {
    const socket = useSocket();
    const [userData, setUserData] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [sharedKey, setSharedKey] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const scroll = useRef();

    // Video Call States
    const [activeCall, setActiveCall] = useState(false);
    const [incomingCall, setIncomingCall] = useState(false);

    // Check if the other user is online
    const checkOnlineStatus = (chat) => {
        const chatMember = chat?.members?.find((member) => member !== currentUser);
        const online = onlineUsers?.find((user) => user.userId === chatMember);
        return online ? true : false;
    };
    const isOnline = checkOnlineStatus(chat);

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
                if (sharedKey) {
                    const decryptedPromises = data.map(async (msg) => {
                        try {
                            const decText = await decryptMessage(sharedKey, msg.text);
                            return { ...msg, text: decText };
                        } catch (e) {
                            return msg;
                        }
                    });
                    const decryptedMsgs = await Promise.all(decryptedPromises);
                    setMessages(decryptedMsgs);
                } else {
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
                    setMessages((prev) => [...prev, receiveMessage]);
                }
            };
            processIncoming();
        }
    }, [receiveMessage]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        let messageParams = {
            senderId: currentUser,
            chatId: chat._id,
        };

        if (sharedKey) {
            const encryptedText = await encryptMessage(sharedKey, newMessage);
            messageParams.text = encryptedText;
        } else {
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
    }, [messages]);

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

    // ===== VIDEO CALL HANDLERS =====
    const handleStartCall = () => {
        setActiveCall(true);
    };

    const handleEndCall = useCallback(async (duration) => {
        setActiveCall(false);
        const defaultLabel = "📹 Video call ended";
        
        let messageParams = {
            senderId: currentUser,
            chatId: chat?._id,
            isCallLog: true,
            callDuration: duration,
        };

        try {
            if (sharedKey) {
                const encryptedText = await encryptMessage(sharedKey, defaultLabel);
                messageParams.text = encryptedText;
            } else {
                messageParams.text = defaultLabel;
            }

            const receiverId = chat?.members?.find((id) => id !== currentUser);
            setSendMessage({ ...messageParams, receiverId, _id: `temp-${Date.now()}`, createdAt: new Date().toISOString() });

            const { data } = await addMessage(messageParams);
            setMessages((prev) => [...prev, { ...data, text: defaultLabel }]);
        } catch (error) {
            console.error("Failed to save or encrypt call log", error);
            // Fallback to local append if save/encrypt fails to keep UX smooth
            setMessages((prev) => [...prev, { ...messageParams, text: defaultLabel, _id: `call-${Date.now()}`, createdAt: new Date().toISOString() }]);
        }
    }, [currentUser, chat, sharedKey, setSendMessage]);

    const handleTriggerIncoming = () => {
        setIncomingCall(true);
    };

    const handleAcceptIncoming = () => {
        setIncomingCall(false);
        setActiveCall(true);
    };

    const handleDeclineIncoming = () => {
        setIncomingCall(false);
    };

    const displayName = userData?.firstname || userData?.username || "User";

    return (
        <div className="chatWindow">
            {chat ? (
                <>
                    {/* Chat Header */}
                    <div className="chat-header">
                        <div className="chat-header-info">
                            {/* Back Button for Mobile */}
                            <div
                                className="back-arrow-chat"
                                onClick={() => setChat(null)}
                            >
                                <FiArrowLeft size={22} />
                            </div>
                            <img
                                src={getProfilePic(userData)}
                                alt=""
                                className="chat-header-img"
                            />
                            <div className="chat-header-name">
                                <span className="name">{displayName} {userData?.lastname || ""}</span>
                                {isTyping ? (
                                    <span className="typing-indicator">typing...</span>
                                ) : isOnline ? (
                                    <span className="online-text">Active now</span>
                                ) : (
                                    <span className="offline-text" style={{ fontSize: '0.75rem', color: '#8e8e8e' }}>Offline</span>
                                )}
                            </div>
                        </div>
                        <div className="chat-header-actions">
                            <button
                                className="header-action-btn phone-btn"
                                onClick={handleTriggerIncoming}
                                title="Simulate Incoming Call"
                            >
                                <FiPhone />
                            </button>
                            <button
                                className="header-action-btn video-call-btn"
                                onClick={handleStartCall}
                                title="Start Video Call"
                                id="start-video-call-btn"
                            >
                                <FiVideo />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="chat-body">
                        {messages.map((message) => (
                            message.isCallLog ? (
                                <div className="message call-history" key={message._id} ref={scroll}>
                                    <span className="call-history-icon">📹</span>
                                    <div className="call-history-details">
                                        <span className="call-history-title">Video Call</span>
                                        <span className="call-history-sub">{message.callDuration || "Ended"}</span>
                                    </div>
                                    <span className="time">
                                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ) : (
                                <div
                                    ref={scroll}
                                    className={message.senderId === currentUser ? "message own" : "message"}
                                    key={message._id || Math.random()}
                                >
                                    <span>{message.text}</span>
                                    <span className="time">
                                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            )
                        ))}
                    </div>

                    {/* Input */}
                    <div className="chat-sender">
                        <input
                            value={newMessage}
                            onChange={handleInput}
                            className="chat-input"
                            placeholder="Message..."
                            onKeyDown={(e) => e.key === 'Enter' && handleSend(e)}
                        />
                        <button className="send-button" onClick={handleSend}>Send</button>
                    </div>

                    {/* Video Call Overlay */}
                    {activeCall && (
                        <VideoCall
                            userData={userData}
                            currentUserAvatar={getProfilePic({ profilePicture: null })}
                            onEndCall={handleEndCall}
                        />
                    )}

                    {/* Incoming Call Notification */}
                    {incomingCall && (
                        <IncomingCall
                            callerName={displayName}
                            callerAvatar={getProfilePic(userData)}
                            onAccept={handleAcceptIncoming}
                            onDecline={handleDeclineIncoming}
                        />
                    )}
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
