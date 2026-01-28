import React, { useState, useEffect } from "react";
import { getUser } from "../../api/UserRequests";

const Conversation = ({ data, currentUserId, online }) => {
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const userId = data.members.find((id) => id !== currentUserId);
        const getUserData = async () => {
            try {
                const { data } = await getUser(userId);
                setUserData(data);
            } catch (error) {
                console.log(error);
            }
        };
        getUserData();
    }, [data, currentUserId]);

    return (
        <>
            <div className="conversation">
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {online && <div className="online-dot"></div>}
                    <img
                        src={userData?.profilePicture ? `http://localhost:5000/images/${userData.profilePicture}` : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
                        alt=""
                        className="followerImage"
                        style={{ width: "50px", height: "50px", borderRadius: "50%" }}
                    />
                    <div className="name" style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column' }}>
                        <span>{userData?.firstname} {userData?.lastname}</span>
                        <span style={{ color: online ? "#51e200" : "" }}>{online ? "Online" : "Offline"}</span>
                    </div>
                </div>
            </div>
            <hr style={{ width: "85%", border: "0.1px solid #ececec" }} />
        </>
    );
};

export default Conversation;
