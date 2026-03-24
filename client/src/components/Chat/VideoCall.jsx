import React, { useState, useEffect, useRef, useCallback } from "react";
import { FiMicOff, FiMic, FiVideo, FiVideoOff, FiPhone, FiLock } from "react-icons/fi";

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ]
};

const VideoCall = ({ socket, currentUserId, remoteUserId, userData, callType, isCaller, onEndCall }) => {
    const [timer, setTimer] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(callType === 'audio');
    const [connectionState, setConnectionState] = useState("connecting");

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const peerConnection = useRef(null);
    const localStream = useRef(null);
    const timerInterval = useRef(null);
    const hasSetup = useRef(false);
    const iceCandidateQueue = useRef([]);

    const getAvatar = () => {
        if (!userData?.profilePicture) return "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
        if (typeof userData.profilePicture === "string" && userData.profilePicture.startsWith("http")) return userData.profilePicture;
        return "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";
    };

    const displayName = userData?.firstname || userData?.username || "User";

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
        const secs = (seconds % 60).toString().padStart(2, "0");
        return `${mins}:${secs}`;
    };

    const startTimer = useCallback(() => {
        if (timerInterval.current) return;
        timerInterval.current = setInterval(() => {
            setTimer(prev => prev + 1);
        }, 1000);
    }, []);

    const cleanup = useCallback(() => {
        if (timerInterval.current) {
            clearInterval(timerInterval.current);
            timerInterval.current = null;
        }
        if (localStream.current) {
            localStream.current.getTracks().forEach(track => track.stop());
            localStream.current = null;
        }
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
    }, []);

    // Create the RTCPeerConnection and get local media (shared by both caller/callee)
    const createPeerConnection = useCallback(async () => {
        // Get local media
        const constraints = {
            audio: true,
            video: callType === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStream.current = stream;

            if (localVideoRef.current && callType === 'video') {
                localVideoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("getUserMedia failed:", err);
            setConnectionState("failed");
            return null;
        }

        // Create peer connection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnection.current = pc;

        // Add local tracks
        localStream.current.getTracks().forEach(track => {
            pc.addTrack(track, localStream.current);
        });

        // Handle incoming remote tracks
        pc.ontrack = (event) => {
            console.log("Remote track received:", event.track.kind);
            if (callType === 'video' && remoteVideoRef.current && event.streams[0]) {
                remoteVideoRef.current.srcObject = event.streams[0];
            } else if (callType === 'audio' && remoteAudioRef.current && event.streams[0]) {
                remoteAudioRef.current.srcObject = event.streams[0];
            }
            setConnectionState("connected");
            startTimer();
        };

        // ICE candidates → relay to remote via socket
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket?.emit("ice-candidate", {
                    to: remoteUserId,
                    candidate: event.candidate
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log("Connection state:", pc.connectionState);
            if (pc.connectionState === 'connected') {
                setConnectionState("connected");
                startTimer();
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                setConnectionState("disconnected");
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log("ICE state:", pc.iceConnectionState);
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                setConnectionState("connected");
                startTimer();
            }
        };

        // Process any queued ICE candidates
        while (iceCandidateQueue.current.length > 0) {
            const candidate = iceCandidateQueue.current.shift();
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) { console.warn("Queued ICE failed:", e); }
        }

        return pc;
    }, [callType, socket, remoteUserId, startTimer]);

    // Caller: create offer and send it
    const createAndSendOffer = useCallback(async () => {
        const pc = peerConnection.current;
        if (!pc) return;
        try {
            console.log("Creating WebRTC offer...");
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket?.emit("webrtc-offer", {
                to: remoteUserId,
                offer: offer
            });
            console.log("Offer sent to", remoteUserId);
        } catch (err) {
            console.error("Failed to create offer:", err);
        }
    }, [socket, remoteUserId]);

    // ───── Socket listeners ─────
    useEffect(() => {
        if (!socket) return;

        // CALLER: Wait for callee to accept, THEN send offer
        const handleCallAccepted = async () => {
            console.log("Call accepted — creating offer");
            if (!peerConnection.current) {
                await createPeerConnection();
            }
            // Small delay to let callee's VideoCall mount and setup PC
            setTimeout(() => {
                createAndSendOffer();
            }, 500);
        };

        // CALLEE: Receive offer → set remote desc → create answer → send back
        const handleOffer = async (data) => {
            console.log("Received WebRTC offer");
            if (!peerConnection.current) {
                await createPeerConnection();
            }
            const pc = peerConnection.current;
            if (!pc) return;
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit("webrtc-answer", {
                    to: remoteUserId,
                    answer: answer
                });
                console.log("Answer sent");
            } catch (err) {
                console.error("Error handling offer:", err);
            }
        };

        // CALLER: Receive answer → set remote desc
        const handleAnswer = async (data) => {
            console.log("Received WebRTC answer");
            const pc = peerConnection.current;
            if (!pc) return;
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            } catch (err) {
                console.error("Error handling answer:", err);
            }
        };

        // Both: Receive ICE candidates
        const handleIceCandidate = async (data) => {
            const pc = peerConnection.current;
            if (pc && pc.remoteDescription) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (err) {
                    console.warn("ICE candidate error:", err);
                }
            } else {
                // Queue it — PC not ready yet
                iceCandidateQueue.current.push(data.candidate);
            }
        };

        // Remote party ended the call
        const handleCallEnded = () => {
            console.log("Remote party ended call");
            const duration = formatTime(timer);
            cleanup();
            onEndCall(duration, callType);
        };

        if (isCaller) {
            socket.on("call-accepted", handleCallAccepted);
        }
        socket.on("webrtc-offer", handleOffer);
        socket.on("webrtc-answer", handleAnswer);
        socket.on("ice-candidate", handleIceCandidate);
        socket.on("call-ended", handleCallEnded);

        return () => {
            socket.off("call-accepted", handleCallAccepted);
            socket.off("webrtc-offer", handleOffer);
            socket.off("webrtc-answer", handleAnswer);
            socket.off("ice-candidate", handleIceCandidate);
            socket.off("call-ended", handleCallEnded);
        };
    }, [socket, remoteUserId, isCaller, timer, cleanup, onEndCall, callType, createPeerConnection, createAndSendOffer]);

    // Setup on mount
    useEffect(() => {
        if (hasSetup.current) return;
        hasSetup.current = true;

        const init = async () => {
            await createPeerConnection();

            // If CALLEE (not caller), the PC is ready — just wait for the offer via socket
            // If CALLER, we wait for "call-accepted" event (handled in socket listener above)
            // So we do NOT create the offer here — the socket listener handles it
            console.log(isCaller ? "Caller: waiting for call-accepted..." : "Callee: waiting for offer...");
        };

        init();

        return () => cleanup();
    }, []);

    // End call handler
    const handleEndCall = useCallback(() => {
        socket?.emit("call-ended", { to: remoteUserId });
        const duration = formatTime(timer);
        cleanup();
        onEndCall(duration, callType);
    }, [socket, remoteUserId, timer, cleanup, onEndCall, callType]);

    // Toggle mute
    const toggleMute = () => {
        if (localStream.current) {
            const audioTrack = localStream.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    // Toggle camera
    const toggleCamera = () => {
        if (localStream.current) {
            const videoTrack = localStream.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);
            }
        }
    };

    const isAudioOnly = callType === 'audio';

    return (
        <div className="modern-video-call">
            <div className="video-bg-blur" style={{ backgroundImage: `url(${getAvatar()})` }}></div>

            {/* Top Bar */}
            <div className="video-top-bar">
                <div className="video-call-info">
                    <span className="video-caller-name">{displayName}</span>
                    <span className="video-call-encryption">
                        <FiLock size={12} />
                        {connectionState === 'connected' ? (
                            <> End-to-end encrypted · {formatTime(timer)}</>
                        ) : connectionState === 'failed' || connectionState === 'disconnected' ? (
                            <> Connection {connectionState}</>
                        ) : (
                            <> {isCaller ? 'Ringing...' : 'Connecting...'}</>
                        )}
                    </span>
                </div>
                {connectionState === 'connecting' && (
                    <div className="call-connecting-pulse"></div>
                )}
            </div>

            {/* Remote View */}
            <div className="video-remote-view">
                {isAudioOnly ? (
                    <div className="audio-call-view">
                        <img src={getAvatar()} alt={displayName} className="video-remote-avatar" />
                        {connectionState === 'connected' && (
                            <div className="audio-wave">
                                <span></span><span></span><span></span><span></span><span></span>
                            </div>
                        )}
                        {connectionState === 'connecting' && (
                            <p className="call-status-text">{isCaller ? 'Ringing...' : 'Connecting...'}</p>
                        )}
                        <audio ref={remoteAudioRef} autoPlay />
                    </div>
                ) : (
                    <>
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            className="remote-video"
                            style={{ display: connectionState === 'connected' ? 'block' : 'none' }}
                        />
                        {connectionState !== 'connected' && (
                            <div className="audio-call-view">
                                <img src={getAvatar()} alt={displayName} className="video-remote-avatar" />
                                <p className="call-status-text">{isCaller ? 'Ringing...' : 'Connecting...'}</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* PiP Self View */}
            {!isAudioOnly && (
                <div className="video-pip">
                    {isCameraOff ? (
                        <div className="pip-camera-off">
                            <FiVideoOff size={24} />
                        </div>
                    ) : (
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="pip-video"
                        />
                    )}
                </div>
            )}

            {/* Controls */}
            <div className="video-controls-dock">
                {!isAudioOnly && (
                    <button
                        className={`control-btn ${isCameraOff ? "active-control" : ""}`}
                        onClick={toggleCamera}
                        title={isCameraOff ? "Turn On Camera" : "Turn Off Camera"}
                    >
                        {isCameraOff ? <FiVideoOff /> : <FiVideo />}
                    </button>
                )}

                <button
                    className={`control-btn ${isMuted ? "active-control" : ""}`}
                    onClick={toggleMute}
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
