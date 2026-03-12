import React, { useState, useEffect, useCallback } from "react";
import { FiMicOff, FiMic, FiVideo, FiVideoOff, FiRefreshCw, FiPhone, FiMinimize2, FiLock } from "react-icons/fi";

const VideoCall = ({ userData, currentUserAvatar, onEndCall }) => {
    const [timer, setTimer] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);

    // Live call timer
    useEffect(() => {
        const interval = setInterval(() => {
            setTimer((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
        const secs = (seconds % 60).toString().padStart(2, "0");
        return `${mins}:${secs}`;
    };

    const handleEndCall = useCallback(() => {
        onEndCall(formatTime(timer));
    }, [timer, onEndCall]);

    const getAvatar = () => {
        if (!userData?.profilePicture) return "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
        if (typeof userData.profilePicture === "string" && userData.profilePicture.startsWith("http")) return userData.profilePicture;
        return "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
    };

    const displayName = userData?.firstname || userData?.username || "User";

    return (
        <div className="modern-video-call">
            {/* Blurred Background simulating full-screen video context */}
            <div 
                className="video-bg-blur"
                style={{ backgroundImage: `url(${getAvatar()})` }}
            ></div>

            {/* Top Bar */}
            <div className="video-top-bar">
                <div className="video-call-info">
                    <span className="video-caller-name">{displayName}</span>
                    <span className="video-call-encryption">
                        <FiLock size={12} /> End-to-end encrypted · {formatTime(timer)}
                    </span>
                </div>
                <button className="video-min-btn" title="Minimize">
                    <FiMinimize2 size={22} />
                </button>
            </div>

            {/* Remote User Main View */}
            <div className="video-remote-view">
                <img src={getAvatar()} alt={displayName} className="video-remote-avatar" />
            </div>

            {/* Picture-in-Picture Self View */}
            <div className="video-pip">
                <img
                    src={currentUserAvatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
                    alt="You"
                    className="pip-avatar"
                />
            </div>

            {/* Bottom Controls Dock */}
            <div className="video-controls-dock">
                <button
                    className={`control-btn ${isCameraOff ? "active-control" : ""}`}
                    onClick={() => setIsCameraOff(!isCameraOff)}
                    title={isCameraOff ? "Turn On Camera" : "Turn Off Camera"}
                >
                    {isCameraOff ? <FiVideoOff /> : <FiVideo />}
                </button>
                
                <button
                    className="control-btn"
                    title="Flip Camera"
                >
                    <FiRefreshCw />
                </button>

                <button
                    className={`control-btn ${isMuted ? "active-control" : ""}`}
                    onClick={() => setIsMuted(!isMuted)}
                    title={isMuted ? "Unmute" : "Mute"}
                >
                    {isMuted ? <FiMicOff /> : <FiMic />}
                </button>

                <button
                    className="control-btn end"
                    onClick={handleEndCall}
                    title="End Call"
                >
                    <FiPhone style={{ transform: 'rotate(135deg)' }} />
                </button>
            </div>
        </div>
    );
};

export default VideoCall;
