import React from "react";
import { FiPhone, FiX } from "react-icons/fi";

const IncomingCall = ({ callerName, callerAvatar, onAccept, onDecline }) => {
    const avatar = callerAvatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
    const displayName = callerName || "Unknown";

    return (
        <div className="modern-incoming-call">
            {/* Blurred Background */}
            <div 
                className="incoming-bg-blur" 
                style={{ backgroundImage: `url(${avatar})` }}
            ></div>
            
            <div className="incoming-content">
                <div className="incoming-header">
                    <img src={avatar} alt={displayName} className="incoming-avatar" />
                    <h2 className="incoming-name">{displayName}</h2>
                    <p className="incoming-status">SkyNestia Video Call...</p>
                </div>

                <div className="incoming-actions">
                    <button className="call-btn decline-btn" onClick={onDecline} title="Decline">
                        <FiX size={32} />
                    </button>
                    <button className="call-btn accept-btn" onClick={onAccept} title="Accept">
                        <div className="accept-pulse-ring"></div>
                        <FiPhone size={32} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IncomingCall;
