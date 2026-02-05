import React, { useEffect, useState } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import { FiX, FiUserCheck, FiHeart, FiBell, FiGrid, FiUser } from 'react-icons/fi';
import './Notifications.css';

const Notifications = ({ isOpen, onClose }) => {
    const [notifications, setNotifications] = useState([]);
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
            fetchRequests();
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        try {
            const res = await API.get('/notification');
            console.log("Fetched notifications:", res.data);
            setNotifications(res.data);
        } catch (error) {
            console.error("Error fetching notifications", error);
        }
    };

    const fetchRequests = async () => {
        try {
            const res = await API.get('/user/requests/pending');
            setInvites(res.data);
        } catch (error) {
            console.error("Error fetching requests", error);
        }
    };

    const handleAccept = async (id) => {
        try {
            await API.put(`/user/requests/${id}/accept`);
            setInvites(prev => prev.filter(cwd => cwd._id !== id));
            // Optional: Refresh notifications to show "You are now following..."
        } catch (error) {
            console.error("Error accepting", error);
        }
    };

    const handleReject = async (id) => {
        try {
            await API.put(`/user/requests/${id}/reject`);
            setInvites(prev => prev.filter(cwd => cwd._id !== id));
        } catch (error) {
            console.error("Error rejecting", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="notifications-panel">
            <div className="notifications-header">
                <h3>Notifications</h3>
                <button onClick={onClose} className="close-btn"><FiX /></button>
            </div>

            <div className="notifications-content">

                {/* Follow Requests Section */}
                {invites.length > 0 && (
                    <div className="section">
                        <h4>Follow Requests</h4>
                        <div className="requests-list">
                            {invites.map(user => (
                                <div key={user._id} className="request-item">
                                    <div className="user-info">
                                        <img
                                            src={user.profilePicture ? (user.profilePicture.startsWith('http') ? user.profilePicture : `${API.defaults.baseURL.replace('/api', '')}/images/${user.profilePicture.split('/').pop()}`) : "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                            alt={user.username}
                                        />
                                        <div>
                                            <strong>{user.username}</strong>
                                            <span>requested to follow you.</span>
                                        </div>
                                    </div>
                                    <div className="actions">
                                        <button onClick={() => handleAccept(user._id)} className="confirm-btn">Confirm</button>
                                        <button onClick={() => handleReject(user._id)} className="delete-btn">Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="section-divider"></div>

                {/* General Notifications Section */}
                <div className="section">
                    <h4>Activity</h4>
                    {notifications.length === 0 && invites.length === 0 ? (
                        <div className="empty-state">
                            <FiBell size={40} />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        <div className="activity-list">
                            {notifications.map(notif => (
                                <div key={notif._id} className="notification-item">
                                    <div className="notif-icon">
                                        {notif.type === 'like' && <FiHeart fill="red" color="red" />}
                                        {notif.type === 'follow_accept' && <FiUserCheck color="green" />}
                                        {notif.type === 'follow_request' && <FiUserCheck />}
                                    </div>
                                    <img
                                        src={notif.senderId?.profilePicture ? (notif.senderId.profilePicture.startsWith('http') ? notif.senderId.profilePicture : `${API.defaults.baseURL.replace('/api', '')}/images/${notif.senderId.profilePicture.split('/').pop()}`) : "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                        alt="sender"
                                        className="sender-avatar"
                                    />
                                    <div className="notif-text">
                                        <strong>{notif.senderId?.username}</strong>
                                        {notif.type === 'like' && ` liked your post.`}
                                        {notif.type === 'follow_accept' && ` accepted your follow request.`}
                                        {notif.type === 'follow_request' && ` sent you a follow request.`}
                                        <span className="time-ago">{new Date(notif.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {notif.postId && notif.postId.image && (
                                        <img
                                            src={`${API.defaults.baseURL.replace('/api', '')}${notif.postId.image}`}
                                            alt="post"
                                            className="post-preview"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notifications;
