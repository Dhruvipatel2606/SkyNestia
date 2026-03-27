import React, { useState, useRef, useEffect } from 'react';
import { FiHeart, FiMessageSquare, FiSend, FiMusic, FiMoreVertical, FiUserPlus, FiUserCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { BASE_URL } from '../../api';
import API from '../../api';
import './Reels.css';

const ReelItem = ({ reel, currentUser, onVideoEnd, isAutoAdvance }) => {
    const [liked, setLiked] = useState(reel.likes?.some(id => (id._id || id).toString() === currentUser?._id));
    const [likesCount, setLikesCount] = useState(reel.likes?.length || 0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [comments, setComments] = useState(reel.comments || []);
    const [isFollowed, setIsFollowed] = useState(reel.userId?.followers?.some(id => (id._id || id).toString() === currentUser?._id));
    const [showLikeAnim, setShowLikeAnim] = useState(false);
    const [progress, setProgress] = useState(0);
    const navigate = useNavigate();
    
    const videoRef = useRef(null);
    const observer = useRef(null);

    useEffect(() => {
        observer.current = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (videoRef.current) {
                        videoRef.current.play().catch(err => console.error("Autoplay failed:", err));
                        setIsPlaying(true);
                    }
                    // Increment view
                    API.put(`/reels/${reel._id}/view`).catch(() => {});
                } else {
                    if (videoRef.current) {
                        videoRef.current.pause();
                        setIsPlaying(false);
                    }
                }
            });
        }, { threshold: 0.8 });

        if (videoRef.current) {
            observer.current.observe(videoRef.current);
        }

        return () => observer.current?.disconnect();
    }, [reel._id]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            if (isAutoAdvance && video.duration) {
                const p = (video.currentTime / video.duration) * 100;
                setProgress(p);
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }, [isAutoAdvance]);

    const handleTogglePlay = (e) => {
        // Only toggle if not clicking on buttons/drawer
        if (e.target.tagName === 'VIDEO' || e.target.classList.contains('reel-overlay')) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleDoubleTap = (e) => {
        if (!liked) {
            handleLike(e);
        }
        setShowLikeAnim(true);
        setTimeout(() => setShowLikeAnim(false), 800);
    };

    const handleLike = async (e) => {
        e.stopPropagation();
        try {
            const res = await API.put(`/reels/${reel._id}/like`);
            setLiked(res.data.liked);
            setLikesCount(res.data.likesCount);
        } catch (err) { console.error(err); }
    };

    const handleAddComment = async (e) => {
        if ((e.key === 'Enter' || e.type === 'click') && newComment.trim()) {
            try {
                const res = await API.post(`/reels/${reel._id}/comment`, { text: newComment });
                // Optimistically update UI if we had currentUser data here, 
                // but res already contains populated userId
                setComments([...comments, res.data]);
                setNewComment("");
            } catch (err) { console.error(err); }
        }
    };

    const handleFollow = async (e) => {
        e.stopPropagation();
        try {
            await API.put(`/user/${reel.userId._id}/follow`);
            setIsFollowed(!isFollowed);
        } catch (err) { console.error(err); }
    };

    const getProfileImg = (user) => {
        if (!user?.profilePicture) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
        if (user.profilePicture.startsWith('http')) return user.profilePicture;
        return `${BASE_URL}/images/${user.profilePicture.split('/').pop()}`;
    };

    return (
        <div className="reel-item" onClick={handleTogglePlay} onDoubleClick={handleDoubleTap}>
            <video 
                ref={videoRef}
                src={`${BASE_URL}${reel.video}`}
                className="reel-video"
                loop={!isAutoAdvance}
                muted
                playsInline
                onEnded={onVideoEnd}
            />

            {isAutoAdvance && (
                <div className="auto-advance-progress-container">
                    <div 
                        className="auto-advance-progress-bar" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            )}

            {showLikeAnim && (
                <div className="heart-animation-overlay">
                    <FiHeart size={80} fill="red" color="red" />
                </div>
            )}

            {/* Video Overlays */}
            <div className="reel-overlay">
                <div className="reel-sidebar">
                    <div className="sidebar-btn" onClick={handleLike}>
                        <FiHeart size={28} className={liked ? "liked-icon" : ""} fill={liked ? "red" : "none"} />
                        <span>{likesCount}</span>
                    </div>
                    <div className="sidebar-btn" onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}>
                        <FiMessageSquare size={28} />
                        <span>{comments.length}</span>
                    </div>
                    <div className="sidebar-btn">
                        <FiSend size={28} />
                    </div>
                    <div className="sidebar-btn">
                        <FiMoreVertical size={24} />
                    </div>
                </div>

                <div className="reel-info">
                    <div className="reel-user-info">
                        <img 
                            src={getProfileImg(reel.userId)} 
                            alt="" 
                            className="reel-avatar" 
                            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${reel.userId._id}`); }}
                        />
                        <span 
                            className="reel-username" 
                            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${reel.userId._id}`); }}
                        >
                            {reel.userId.username}
                        </span>
                        {reel.userId.isVerified && <span className="verified-badge">✔️</span>}
                        {reel.userId._id !== currentUser._id && (
                            <button 
                                className={`reel-follow-btn ${isFollowed ? 'followed' : ''}`}
                                onClick={handleFollow}
                            >
                                {isFollowed ? 'Following' : 'Follow'}
                            </button>
                        )}
                    </div>
                    <p className="reel-caption">{reel.caption}</p>
                    <div className="reel-music">
                        <FiMusic size={14} />
                        <span className="music-scroll">
                            {reel.music?.title} - {reel.music?.artist || reel.userId.username}
                        </span>
                    </div>
                </div>
            </div>

            {/* Comments Drawer */}
            {showComments && (
                <div className="reel-comments-overlay" onClick={(e) => { e.stopPropagation(); setShowComments(false); }}>
                    <div className="reel-comments-content" onClick={e => e.stopPropagation()}>
                        <div className="comments-header">
                            <h3>Comments</h3>
                            <button onClick={() => setShowComments(false)}>×</button>
                        </div>
                        <div className="comments-list">
                            {comments.map((c, idx) => (
                                <div key={idx} className="comment-item">
                                    <img src={getProfileImg(c.userId)} alt="" />
                                    <div>
                                        <span className="comment-user"><strong>{c.userId.username}</strong></span>
                                        <p className="comment-text">{c.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="comment-input-area">
                            <input 
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={handleAddComment}
                                placeholder="Add a comment..." 
                            />
                            <button className="btn-comment-send" onClick={handleAddComment}>Post</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReelItem;
