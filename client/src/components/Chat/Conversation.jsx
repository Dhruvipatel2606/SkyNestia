import React, { useState, useEffect } from "react";
import { getUser } from "../../api/UserRequests";
import API from "../../api.js";

const Conversation = ({ data, currentUserId, online }) => {
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const userId = data.members.find((id) => id !== currentUserId);
        const getUserData = async () => {
            try {
                const { data } = await getUser(userId);
                const user = data.user || data.profile || data;
                setUserData(user);
            } catch (error) {
                console.log(error);
            }
        };
        getUserData();
    }, [data, currentUserId]);

    const getProfilePic = (user) => {
        if (!user?.profilePicture) return "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
        if (typeof user.profilePicture === 'string' && user.profilePicture.startsWith('http')) return user.profilePicture;
        const picName = typeof user.profilePicture === 'string' ? user.profilePicture.split('/').pop() : "";
        return `${API.defaults.baseURL.replace('/api', '')}/images/${picName}`;
    };

    // Simulate unread count (random for demo — in production, this comes from backend)
    const [unread] = useState(() => Math.random() > 0.6 ? Math.floor(Math.random() * 5) + 1 : 0);

    return (
        <div className="conversation">
            <div className="follower">
                <div style={{ position: 'relative' }}>
                    <img
                        src={getProfilePic(userData)}
                        alt=""
                    />
                    {online && <div className="online-dot"></div>}
                </div>
                <div className="convo-text">
                    <span className="name">
                        {userData?.firstname || userData?.username} {userData?.lastname || ""}
                    </span>
                    <span className="status">
                        {online ? "Active now" : "Tap to chat"}
                    </span>
                </div>
                {unread > 0 && <span className="unread-badge">{unread}</span>}
            </div>
        </div>
    );
};

export default Conversation;
