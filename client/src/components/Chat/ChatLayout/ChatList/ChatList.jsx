import React, { useState, useEffect } from "react";
import Conversation from "../../Conversation";
import API from "../../../../api.js"; // Assuming api import
import { FiPlus, FiX } from "react-icons/fi";
import { createChat } from "../../../../api/ChatRequests"; // Adjust import path if needed

export default function ChatList({ chats, setCurrentChat, onlineUsers, currentUser, setChats }) {
    const [showModal, setShowModal] = useState(false);
    const [following, setFollowing] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (showModal && currentUser) {
            setLoading(true);
            const fetchFollowing = async () => {
                try {
                    const res = await API.get(`/user/following/${currentUser._id}`);
                    setFollowing(res.data);
                } catch (error) {
                    console.error("Error fetching following:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchFollowing();
        }
    }, [showModal, currentUser]);

    const handleStartChat = async (userId) => {
        try {
            const res = await createChat(currentUser._id, userId);
            const chatData = res.data;

            const existingChat = chats.find(c => c._id === chatData._id);
            if (!existingChat) {
                if (setChats) setChats(prev => [chatData, ...prev]);
            }
            setCurrentChat(chatData);
            setShowModal(false);
        } catch (error) {
            console.error("Error starting chat:", error);
        }
    };

    const getProfileImg = (img) => {
        if (!img) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
        if (img.startsWith("http")) return img;
        return `${API.defaults.baseURL.replace('/api', '')}/images/${img.split('/').pop()}`;
    };

    const checkOnlineStatus = (chat) => {
        const chatMember = chat.members.find((member) => member !== currentUser._id);
        const online = onlineUsers.find((u) => u.userId === chatMember);
        return online ? true : false;
    };

    return (
        <div className="chatList">
            <div className="chatList-header">
                <h3>Chats</h3>
                <button className="new-chat-btn" onClick={() => setShowModal(true)} title="New Chat">
                    <FiPlus />
                </button>
            </div>

            <div className="chatList-container">
                {chats.map((chat) => (
                    <div onClick={() => setCurrentChat(chat)} key={chat._id}>
                        <Conversation
                            data={chat}
                            currentUserId={currentUser._id}
                            online={checkOnlineStatus(chat)}
                        />
                    </div>
                ))}
                {chats.length === 0 && <span style={{ padding: '20px', color: 'var(--text-muted)' }}>No chats yet. Start a conversation!</span>}
            </div>

            {/* New Chat Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>New Message</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}><FiX /></button>
                        </div>
                        <div className="modal-body">
                            {loading ? <p>Loading people...</p> : (
                                <div className="following-list">
                                    {following.map(user => (
                                        <div key={user._id} onClick={() => handleStartChat(user._id)} className="following-item">
                                            <img src={getProfileImg(user.profilePicture)}
                                                alt="" />
                                            <span>{user.username || user.firstname}</span>
                                        </div>
                                    ))}
                                    {following.length === 0 && <p className="muted">You are not following anyone yet.</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
