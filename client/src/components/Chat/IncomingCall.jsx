import React, { useEffect, useRef } from "react";
import { FiPhone, FiX, FiVideo } from "react-icons/fi";

const IncomingCall = ({ callerName, callerAvatar, callType, onAccept, onDecline }) => {
    const avatar = callerAvatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
    const displayName = callerName || "Unknown";
    const ringtoneRef = useRef(null);

    // Ringtone + vibrate
    useEffect(() => {
        // Create ringtone using oscillator (no external file needed)
        let audioCtx;
        let oscillator;
        let gainNode;
        let ringInterval;

        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioCtx.createGain();
            gainNode.gain.value = 0.15;
            gainNode.connect(audioCtx.destination);

            // Ring pattern: on 1s → off 2s
            const ring = () => {
                oscillator = audioCtx.createOscillator();
                oscillator.type = 'sine';
                oscillator.frequency.value = 440;
                oscillator.connect(gainNode);
                oscillator.start();
                setTimeout(() => {
                    try { oscillator.stop(); } catch (e) {}
                }, 1000);
            };

            ring();
            ringInterval = setInterval(ring, 3000);
        } catch (e) {
            console.warn("Ringtone not supported:", e);
        }

        // Vibrate on mobile
        if (navigator.vibrate) {
            navigator.vibrate([500, 300, 500, 300, 500]);
        }

        return () => {
            if (ringInterval) clearInterval(ringInterval);
            if (audioCtx) {
                try { audioCtx.close(); } catch (e) {}
            }
            if (navigator.vibrate) navigator.vibrate(0);
        };
    }, []);

    return (
        <div className="modern-incoming-call">
            <div className="incoming-bg-blur" style={{ backgroundImage: `url(${avatar})` }}></div>
            
            <div className="incoming-content">
                <div className="incoming-header">
                    <div className="incoming-avatar-ring">
                        <img src={avatar} alt={displayName} className="incoming-avatar" />
                    </div>
                    <h2 className="incoming-name">{displayName}</h2>
                    <p className="incoming-status">
                        {callType === 'video' ? (
                            <><FiVideo size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> SkyNestia Video Call...</>
                        ) : (
                            <><FiPhone size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} /> SkyNestia Voice Call...</>
                        )}
                    </p>
                </div>

                <div className="incoming-actions">
                    <div className="call-action-group">
                        <button className="call-btn decline-btn" onClick={onDecline} title="Decline">
                            <FiX size={32} />
                        </button>
                        <span className="call-action-label">Decline</span>
                    </div>
                    <div className="call-action-group">
                        <button className="call-btn accept-btn" onClick={onAccept} title="Accept">
                            <div className="accept-pulse-ring"></div>
                            <FiPhone size={32} />
                        </button>
                        <span className="call-action-label">Accept</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IncomingCall;
