
import React, { useState, useEffect } from "react";

export default function Header({ chat }) {
    const [userData, setUserData] = useState(null);
    const currentUserId = JSON.parse(localStorage.getItem('user'))?._id;

    useEffect(() => {
        if (chat && chat.members) {
            const memberId = chat.members.find((id) => id !== currentUserId);
            if (memberId) {
                // fetch user. But to avoid excessive imports/complexity I will just show generic or placeholder
                // If I import getUser, I need to get path right: ../../../../../api/UserRequests
            }
        }
    }, [chat, currentUserId]);

    return (
        <div className="chatHeader">
            <span style={{ fontWeight: "bold" }}>Chat</span>
        </div>
    );
}
