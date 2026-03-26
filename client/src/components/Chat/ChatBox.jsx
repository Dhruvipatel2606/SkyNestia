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

    // Call States
    const [activeCall, setActiveCall] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null); // { callerId, callerName, callerAvatar, callType }
    const [callType, setCallType] = useState(null); // 'video' | 'audio'
    const [isCaller, setIsCaller] = useState(false);

    const checkOnlineStatus = (chat) => {
        const chatMember = chat?.members?.find((member) => member !== currentUser);
        return onlineUsers?.some((user) => user.userId === chatMember) || false;
    };
    const isOnline = checkOnlineStatus(chat);

    // Fetch header user data + setup encryption
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
                        } catch (e) { return msg; }
                    });
                    setMessages(await Promise.all(decryptedPromises));
                } else {
                    setMessages(data);
                }
            } catch (error) { console.log(error); }
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

    // ───── Call Socket Listeners ─────
    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = (data) => {
            // Only show if we're in the right chat or even if not
            setIncomingCall({
                callerId: data.callerId,
                callerName: data.callerName,
                callerAvatar: data.callerAvatar,
                callType: data.callType
            });
        };

        const handleCallRejected = () => {
            setActiveCall(false);
            setCallType(null);
            setIsCaller(false);
        };

        const handleCallNotAvailable = () => {
            alert("User is currently offline. Try again later.");
            setActiveCall(false);
            setCallType(null);
            setIsCaller(false);
        };

        const handleCallEnded = () => {
            setActiveCall(false);
            setCallType(null);
            setIsCaller(false);
        };

        socket.on("incoming-call", handleIncomingCall);
        socket.on("call-rejected", handleCallRejected);
        socket.on("call-not-available", handleCallNotAvailable);
        socket.on("call-ended", handleCallEnded);

        return () => {
            socket.off("incoming-call", handleIncomingCall);
            socket.off("call-rejected", handleCallRejected);
            socket.off("call-not-available", handleCallNotAvailable);
            socket.off("call-ended", handleCallEnded);
        };
    }, [socket]);

    // ───── Call Handlers ─────
    const currentUserData = (() => {
        try {
            return JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user'));
        } catch { return null; }
    })();

    const getProfilePic = (user) => {
        if (!user?.profilePicture) return "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
        if (typeof user.profilePicture === 'string' && user.profilePicture.startsWith('http')) return user.profilePicture;
        const picName = typeof user.profilePicture === 'string' ? user.profilePicture.split('/').pop() : "";
        return `${BASE_URL}/images/${picName}`;
    };

    const handleStartCall = (type) => {
        if (!isOnline) {
            alert("User is offline. Cannot start a call.");
            return;
        }
        const receiverId = chat?.members?.find((id) => id !== currentUser);
        setCallType(type);
        setIsCaller(true);
        setActiveCall(true);

        socket?.emit("call-user", {
            callerId: currentUser,
            callerName: currentUserData?.firstname || currentUserData?.username || 'User',
            callerAvatar: getProfilePic(currentUserData),
            receiverId,
            callType: type
        });
    };

    const handleAcceptIncoming = () => {
        if (!incomingCall) return;
        setCallType(incomingCall.callType);
        setIsCaller(false);
        setActiveCall(true);

        socket?.emit("call-accepted", {
            callerId: incomingCall.callerId,
            receiverId: currentUser
        });

        setIncomingCall(null);
    };

    const handleDeclineIncoming = () => {
        if (!incomingCall) return;
        socket?.emit("call-rejected", {
            callerId: incomingCall.callerId,
            receiverId: currentUser
        });
        setIncomingCall(null);
    };

    const handleEndCall = useCallback(async (duration, type) => {
        setActiveCall(false);
        setCallType(null);
        setIsCaller(false);

        const callEmoji = type === 'video' ? '📹' : '📞';
        const callLabel = type === 'video' ? 'Video call' : 'Voice call';
        const defaultLabel = `${callEmoji} ${callLabel} ended`;

        let messageParams = {
            senderId: currentUser,
            chatId: chat?._id,
            isCallLog: true,
            callDuration: duration,
        };

        try {
            messageParams.text = sharedKey ? await encryptMessage(sharedKey, defaultLabel) : defaultLabel;
            const receiverId = chat?.members?.find((id) => id !== currentUser);
            setSendMessage({ ...messageParams, receiverId, _id: `temp-${Date.now()}`, createdAt: new Date().toISOString() });
            const { data } = await addMessage(messageParams);
            setMessages((prev) => [...prev, { ...data, text: defaultLabel }]);
        } catch (error) {
            console.error("Failed to save call log", error);
            setMessages((prev) => [...prev, { ...messageParams, text: defaultLabel, _id: `call-${Date.now()}`, createdAt: new Date().toISOString() }]);
        }
    }, [currentUser, chat, sharedKey, setSendMessage]);

    // Mark messages as read
    const markAllRead = useCallback(async () => {
        if (!chat || !currentUser) return;
        try {
            await API.put(`/message/${chat._id}/read/${currentUser}`);
            const receiverId = chat.members.find(id => id !== currentUser);
            socket?.emit("message-read", { chatId: chat._id, senderId: receiverId });
        } catch (err) { console.error("Mark read failed", err); }
    }, [chat, currentUser, socket]);

    useEffect(() => {
        if (chat) markAllRead();
    }, [chat, messages.length, markAllRead]);

    useEffect(() => {
        if (!socket) return;
        const handleReadReceipt = (data) => {
            if (data.chatId === chat?._id) {
                setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
            }
        };
        socket.on("message-read", handleReadReceipt);
        return () => socket.off("message-read", handleReadReceipt);
    }, [socket, chat]);

    const handleSend = async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('chat-image-upload');
        const file = fileInput?.files[0];
        
        if (!newMessage.trim() && !file) return;

        const receiverId = chat.members.find((id) => id !== currentUser);
        const formData = new FormData();
        formData.append('chatId', chat._id);
        formData.append('senderId', currentUser);
        formData.append('receiverId', receiverId);
        
        if (file) {
            formData.append('image', file);
        }

        let encryptedText = newMessage;
        if (newMessage.trim() && sharedKey) {
            encryptedText = await encryptMessage(sharedKey, newMessage);
        }
        formData.append('text', encryptedText);

        try {
            const { data } = await API.post('/message', formData);
            setSendMessage({ ...data, receiverId, text: encryptedText });
            setMessages([...messages, { ...data, text: newMessage }]);
            setNewMessage("");
            if (fileInput) fileInput.value = "";
        } catch (error) { console.log(error); }
    };

    useEffect(() => {
        scroll.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Typing
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

    const displayName = userData?.firstname || userData?.username || "User";
    const remoteUserId = chat?.members?.find((id) => id !== currentUser);

    return (
        <div className="chatWindow">
            {chat ? (
                <>
                    {/* Chat Header */}
                    <div className="chat-header">
                        <div className="chat-header-info">
                            <div className="back-arrow-chat" onClick={() => setChat(null)}>
                                <FiArrowLeft size={22} />
                            </div>
                            <img src={getProfilePic(userData)} alt="" className="chat-header-img" />
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
                                onClick={() => handleStartCall('audio')}
                                title="Voice Call"
                            >
                                <FiPhone />
                            </button>
                            <button
                                className="header-action-btn video-call-btn"
                                onClick={() => handleStartCall('video')}
                                title="Video Call"
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
                                    <span className="call-history-icon">{message.text?.includes('Video') ? '📹' : '📞'}</span>
                                    <div className="call-history-details">
                                        <span className="call-history-title">{message.text?.includes('Video') ? 'Video Call' : 'Voice Call'}</span>
                                        <span className="call-history-sub">{message.callDuration || "Ended"}</span>
                                    </div>
                                    <span className="time">
                                        {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ) : (
                                    <div ref={scroll} className={message.senderId === currentUser ? "message own" : "message"} key={message._id || Math.random()}>
                                        {message.image && (
                                            <img 
                                                src={`${API.defaults.baseURL.replace('/api', '')}${message.image}`} 
                                                alt="sent" 
                                                className="chat-image-msg" 
                                                style={{ maxWidth: '200px', borderRadius: '8px', marginBottom: '5px' }}
                                            />
                                        )}
                                        {message.text && <span>{message.text}</span>}
                                        <div className="message-info-footer">
                                            <span className="time">
                                                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {message.senderId === currentUser && (
                                                <span className="read-status">
                                                    {message.isRead ? " ✓✓ Seen" : " ✓ Sent"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
    
                        {/* Input */}
                        <div className="chat-sender">
                            <label htmlFor="chat-image-upload" className="image-upload-btn" style={{ cursor: 'pointer', padding: '0 10px', display: 'flex', alignItems: 'center' }}>
                                📷
                                <input type="file" id="chat-image-upload" hidden accept="image/*" />
                            </label>
                            <input
                                value={newMessage}
                                onChange={handleInput}
                                className="chat-input"
                                placeholder="Message..."
                                onKeyDown={(e) => e.key === 'Enter' && handleSend(e)}
                            />
                            <button className="send-button" onClick={handleSend}>Send</button>
                        </div>

                    {/* Active Call Overlay */}
                    {activeCall && (
                        <VideoCall
                            socket={socket}
                            currentUserId={currentUser}
                            remoteUserId={remoteUserId}
                            userData={userData}
                            callType={callType}
                            isCaller={isCaller}
                            onEndCall={handleEndCall}
                        />
                    )}

                    {/* Incoming Call Notification */}
                    {incomingCall && (
                        <IncomingCall
                            callerName={incomingCall.callerName}
                            callerAvatar={incomingCall.callerAvatar}
                            callType={incomingCall.callType}
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
