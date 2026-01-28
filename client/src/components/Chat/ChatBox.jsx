import React, { useEffect, useState, useRef } from "react";
import { addMessage, getMessages } from "../../api/MessageRequests";
import { getUser } from "../../api/UserRequests";
import "./Chat.css";
import { importKey, deriveSharedKey, encryptMessage, decryptMessage } from '../../utils/Encryption';

const ChatBox = ({ chat, currentUser, setSendMessage, receiveMessage }) => {
    const [userData, setUserData] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [sharedKey, setSharedKey] = useState(null);
    const scroll = useRef();

    // Fetching data for header and setting up Encryption
    useEffect(() => {
        const userId = chat?.members?.find((id) => id !== currentUser);
        if (chat !== null) {
            const getUserData = async () => {
                try {
                    const { data } = await getUser(userId);
                    setUserData(data);

                    const myKeysJson = localStorage.getItem('e2ee_keys');
                    if (myKeysJson && data.publicKey) {
                        const { privateKey: myPrivJwk } = JSON.parse(myKeysJson);
                        const myPriv = await importKey(JSON.stringify(myPrivJwk), 'private');
                        const theirPub = await importKey(data.publicKey, 'public');
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
                        const decText = await decryptMessage(sharedKey, msg.text);
                        return { ...msg, text: decText };
                    });
                    const decryptedMsgs = await Promise.all(decryptedPromises);
                    setMessages(decryptedMsgs);
                } else {
                    setMessages(data.map(m => ({ ...m, text: "🔒 Encrypted" })));
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
            const decryptedData = async () => {
                if (sharedKey) {
                    const decText = await decryptMessage(sharedKey, receiveMessage.text);
                    setMessages((prev) => [...prev, { ...receiveMessage, text: decText }]);
                } else {
                    setMessages((prev) => [...prev, { ...receiveMessage, text: "🔒 Encrypted" }]);
                }
            }
            decryptedData();
        }
    }, [receiveMessage])

    const handleSend = async (e) => {
        e.preventDefault();
        if (!sharedKey) {
            alert("Encryption key not established. Ensuring end-to-end security. Wait or refresh.");
            return;
        }

        if (!newMessage.trim()) return;

        const encryptedText = await encryptMessage(sharedKey, newMessage);

        const message = {
            senderId: currentUser,
            text: encryptedText,
            chatId: chat._id,
        };

        const receiverId = chat.members.find((id) => id !== currentUser);
        setSendMessage({ ...message, receiverId });

        try {
            const { data } = await addMessage(message);
            setMessages([...messages, { ...data, text: newMessage }]);
            setNewMessage("");
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        scroll.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages])

    return (
        <div className="ChatBox-container">
            {chat ? (
                <>
                    <div className="chat-header">
                        <div className="follower">
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <img
                                        src={
                                            userData?.profilePicture
                                                ? `http://localhost:5000/images/${userData.profilePicture}`
                                                : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
                                        }
                                        alt=""
                                        className="followerImage"
                                        style={{ width: "50px", height: "50px", borderRadius: "50%" }}
                                    />
                                    <div className="name" style={{ fontSize: "0.9rem" }}>
                                        <span>
                                            {userData?.firstname} {userData?.lastname}
                                        </span>
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
                            </div>
                        ))}
                    </div>
                    <div className="chat-sender">
                        <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="chat-input" placeholder="Type a message... (E2EE)" />
                        <button className="send-button" onClick={handleSend}>Send</button>
                    </div>
                </>
            ) : (
                <span className="chatbox-empty-message">
                    Select a conversation to start chatting...
                </span>
            )}
        </div>
    );
};

export default ChatBox;
