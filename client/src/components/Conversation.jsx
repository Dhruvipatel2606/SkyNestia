import React, { useState, useEffect } from "react";
import API from "../api";

export default function Conversation({ data, currentUserId, online }) {
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const userId = data.members.find((id) => id !== currentUserId);
        const getUserData = async () => {
            try {
                const res = await API.get(`/user/${userId}`);
                const data = res.data.profile || res.data;
                setUserData(data);
            } catch (error) {
                console.log(error);
            }
        };
        getUserData();
    }, [data, currentUserId]);

    return (
        <div className="conversation">
            <div className="follower">
                {online && <div className="online-dot"></div>}
                <img
                    src={userData?.profilePicture || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                    alt="Profile"
                    className="conversationImg"
                    style={{ width: "50px", height: "50px", borderRadius: "50%" }}
                />
                <div className="name" style={{ fontSize: '0.8rem' }}>
                    <span>{userData?.username || userData?.firstname || "Loading..."}</span>
                    <div style={{ color: online ? "#51e200" : "" }}>
                        {online ? "Online" : "Offline"}
                    </div>
                </div>
            </div>
            <hr style={{ width: "85%", border: "0.1px solid #ececec" }} />
        </div>
    );
}
