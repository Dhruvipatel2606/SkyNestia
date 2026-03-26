import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../api.js';
import './Post.css';
import { FiHeart, FiMessageCircle, FiSend, FiBookmark, FiMoreHorizontal, FiUser, FiFlag, FiChevronLeft, FiChevronRight, FiTrash2, FiCornerDownRight, FiSmile } from 'react-icons/fi';
import EmojiPicker from 'emoji-picker-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGlobe, FaUserFriends } from 'react-icons/fa';
import { useSocket } from '../../SocketContext';

const Post = ({ post }) => {
    const navigate = useNavigate();
    const [likes, setLikes] = useState(post.likes?.length || 0);
    const [isLiked, setIsLiked] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showTags, setShowTags] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentCaption, setCurrentCaption] = useState(post.caption || "");
    const [editedCaption, setEditedCaption] = useState(post.caption || "");
    const [reportMode, setReportMode] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [replyingTo, setReplyingTo] = useState(null); // { id, username }
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const nextImage = () => {
        if (post.images && currentImageIndex < post.images.length - 1) {
            setCurrentImageIndex(prev => prev + 1);
        }
    };

    const prevImage = () => {
        if (currentImageIndex > 0) {
            setCurrentImageIndex(prev => prev - 1);
        }
    };

    const currentUserStr = sessionStorage.getItem("user") || localStorage.getItem("user");
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const currentUserId = currentUser?._id;

    const isOwner = currentUser && (
        (post.userId?._id === currentUserId) ||
        (post.userId === currentUserId)
    );

    const [isSaved, setIsSaved] = useState(() => {
        if (!currentUser || !currentUser.savedPosts) return false;
        return currentUser.savedPosts.some(p => (p._id || p) === post._id);
    });

    useEffect(() => {
        if (post.likes?.includes(currentUserId)) {
            setIsLiked(true);
        }
    }, [post.likes, currentUserId]);

    const handleLike = async () => {
        try {
            await API.put(`/post/${post._id}/like`, { userId: currentUserId });
            if (isLiked) {
                setLikes(prev => prev - 1);
                setIsLiked(false);
            } else {
                setLikes(prev => prev + 1);
                setIsLiked(true);
            }
        } catch (err) {
            console.error("Like error", err);
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this post?")) {
            try {
                await API.delete(`/post/${post._id}`);
                navigate('/profile');
                window.location.href = '/profile';
            } catch (err) {
                console.error("Delete error", err);
                alert("Failed to delete post.");
            }
        }
    };

    const handleUpdatePost = async () => {
        try {
            await API.put(`/post/${post._id}`, { caption: editedCaption });
            setCurrentCaption(editedCaption);
            setIsEditing(false);
        } catch (err) {
            console.error("Update error", err);
            alert("Failed to update post.");
        }
    };

    const toggleComments = async () => {
        if (!showComments && comments.length === 0) {
            setLoadingComments(true);
            try {
                const res = await API.get(`/comment/${post._id}`);
                setComments(res.data);
            } catch (err) {
                console.error("Fetch comments error", err);
            } finally {
                setLoadingComments(false);
            }
        }
        setShowComments(!showComments);
    };

    const handleWebShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'SkyNestia Post',
                    text: post.caption,
                    url: window.location.href,
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            alert('Sharing is not supported on this browser');
        }
    };

    const submitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const res = await API.post('/comment', {
                postId: post._id,
                userId: currentUserId,
                text: newComment,
                parentId: replyingTo?.id || null
            });
            setComments(prev => [res.data, ...prev]);
            setNewComment("");
            setReplyingTo(null);
        } catch (err) {
            console.error("Comment error", err);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Delete this comment?")) return;
        try {
            await API.delete(`/comment/${commentId}`);
            setComments(prev => prev.filter(c => c._id !== commentId && c.parentId !== commentId));
        } catch (err) {
            console.error("Delete comment error", err);
        }
    };

    const handleToggleCommentLike = async (commentId) => {
        try {
            const res = await API.put(`/comment/${commentId}/like`);
            setComments(prev => prev.map(c => {
                if (c._id === commentId) {
                    const newLikes = res.data.liked 
                        ? [...(c.likes || []), currentUserId] 
                        : (c.likes || []).filter(id => id !== currentUserId);
                    return { ...c, likes: newLikes };
                }
                return c;
            }));
        } catch (err) {
            console.error("Like comment error", err);
        }
    };

    const getUserName = (user) => {
        if (!user) return 'Unknown User';
        return user.username || 'Unknown User';
    };

    const getProfilePic = (user) => {
        return user?.profilePicture || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
    };

    const handleSave = async () => {
        try {
            const res = await API.put(`/post/${post._id}/save`);
            setIsSaved(res.data.saved);

            if (currentUser) {
                let newSaved = currentUser.savedPosts || [];
                if (res.data.saved) {
                    if (!newSaved.includes(post._id)) newSaved.push(post._id);
                } else {
                    newSaved = newSaved.filter(id => (id._id || id) !== post._id);
                }
                const updatedUser = { ...currentUser, savedPosts: newSaved };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                sessionStorage.setItem('user', JSON.stringify(updatedUser));
            }

        } catch (err) {
            console.error("Save error", err);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s`;
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d`;
        return `${Math.floor(diffInDays / 7)}w`;
    };

    const handleReport = async (reason) => {
        try {
            await API.post('/report', {
                targetType: 'post',
                targetId: post._id,
                reason
            });
            alert('Report submitted. Thank you for helping keep our community safe.');
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to submit report';
            alert(msg);
        }
        setReportMode(false);
        setShowOptions(false);
        setReportReason('');
    };

    return (
        <div className="post-card">
            {/* Header */}
            <div className="post-header">
                <Link to={`/profile/${post.userId?._id}`} className="post-header-user">
                    <div className="story-ring">
                        <img className="post-avatar" src={getProfilePic(post.userId)} alt="avatar" />
                    </div>
                    <div className="post-info-text">
                        <span className="post-username">{getUserName(post.userId)}</span>
                        <span className="post-time" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            • {formatTime(post.createdAt)} •
                            {post.visibility === 'followers' ? (
                                <FaUserFriends size={12} title="Followers Only" style={{ color: '#65676b' }} />
                            ) : (
                                <FaGlobe size={12} title="Public" style={{ color: '#65676b' }} />
                            )}
                        </span>
                        {post.isModerated && (
                            <span
                                className="behavior-badge"
                                title={`Behavior Check: ${post.behaviorAudit?.reasoning || 'Safe'}`}
                                style={{ marginLeft: '4px', cursor: 'help', color: '#0095f6', fontSize: '12px' }}
                            >
                                🛡️
                            </span>
                        )}
                    </div>
                </Link>
                <div className="post-options" style={{ position: 'relative' }}>
                    <button className="icon-btn" onClick={() => setShowOptions(!showOptions)}><FiMoreHorizontal /></button>
                    {showOptions && (
                        <div className="options-menu">
                            {isOwner && (
                                <>
                                    <div className="option-item" onClick={() => { setIsEditing(true); setShowOptions(false); }}>Edit</div>
                                    <div className="option-item delete" onClick={handleDelete}>Delete</div>
                                </>
                            )}
                            {!isOwner && !reportMode && (
                                <div className="option-item" onClick={() => setReportMode(true)} style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <FiFlag size={14} /> Report
                                </div>
                            )}
                            {reportMode && (
                                <>
                                    {['spam', 'harassment', 'inappropriate', 'hate_speech', 'violence', 'other'].map(reason => (
                                        <div key={reason} className="option-item" onClick={() => handleReport(reason)} style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>
                                            {reason.replace('_', ' ')}
                                        </div>
                                    ))}
                                    <div className="option-item" onClick={() => { setReportMode(false); }}>← Back</div>
                                </>
                            )}
                            <div className="option-item" onClick={() => { setShowOptions(false); setReportMode(false); }}>Cancel</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content (Image) */}
            <div className="post-content-visual" style={{ position: 'relative' }}>
                {(post.images && post.images.length > 0) ? (
                    <div className="post-carousel-container" style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
                        <img 
                            src={`${API.defaults.baseURL.replace('/api', '')}${post.images[currentImageIndex]}`} 
                            alt="" 
                            className="post-single-img" 
                        />
                        {post.images.length > 1 && (
                            <>
                                {currentImageIndex > 0 && (
                                    <button className="carousel-nav-btn left" onClick={prevImage}>
                                        <FiChevronLeft size={24} color="white" />
                                    </button>
                                )}
                                {currentImageIndex < post.images.length - 1 && (
                                    <button className="carousel-nav-btn right" onClick={nextImage}>
                                        <FiChevronRight size={24} color="white" />
                                    </button>
                                )}
                                <div className="carousel-dots">
                                    {post.images.map((_, idx) => (
                                        <div key={idx} className={`carousel-dot ${currentImageIndex === idx ? 'active' : ''}`} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ) : post.image ? (
                    <img src={`${API.defaults.baseURL.replace('/api', '')}${post.image}`} alt="" className="post-single-img" />
                ) : null}

                {/* Tagged Users Indicator and Overlay */}
                {post.tags && post.tags.filter(t => t.status !== 'rejected').length > 0 && (
                    <>
                        <button
                            className="tag-indicator-btn"
                            onClick={() => setShowTags(!showTags)}
                            title="View tagged people"
                        >
                            <FiUser />
                        </button>

                        {showTags && (
                            <div className="tags-overlay">
                                <div className="tags-list-bubble">
                                    {post.tags.filter(t => t.status !== 'rejected').map((tag, idx) => (
                                        <Link
                                            to={`/profile/${tag.userId?._id}`}
                                            key={idx}
                                            className={`tagged-user-link ${tag.status === 'pending' ? 'tag-pending' : ''}`}
                                            title={tag.status === 'pending' ? 'Pending Approval' : 'Approved'}
                                        >
                                            {tag.userId?.username || tag.userId?.firstname || "Unknown User"}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Music Player */}
            {post.music && (
                <div className="post-music-indicator">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span>🎵 Music</span>
                    </div>
                    <audio controls src={post.music.startsWith('http') ? post.music : `${API.defaults.baseURL.replace('/api', '')}${post.music}`} style={{ width: '100%' }} />
                </div>
            )}

            {/* Action Bar */}
            <div className="post-actions-bar">
                <div className="actions-left">
                    <button className={`action-icon ${isLiked ? 'liked-icon' : ''}`} onClick={handleLike}>
                        <FiHeart fill={isLiked ? "#ed4956" : "none"} color={isLiked ? "#ed4956" : "currentColor"} />
                    </button>
                    <button className="action-icon" onClick={toggleComments}>
                        <FiMessageCircle />
                    </button>
                    <button className="action-icon" onClick={handleWebShare}>
                        <FiSend />
                    </button>
                </div>
                <div className="actions-right">
                    <button className="action-icon" onClick={handleSave}>
                        <FiBookmark fill={isSaved ? "currentColor" : "none"} />
                    </button>
                </div>
            </div>

            {/* Likes & Description */}
            <div className="post-meta">
                <div className="likes-count">
                    {likes} likes
                </div>
                <div className="post-caption">
                    <span className="caption-username">{getUserName(post.userId)}</span>&nbsp;
                    {isEditing ? (
                        <div style={{ marginTop: '5px' }}>
                            <textarea
                                value={editedCaption}
                                onChange={(e) => setEditedCaption(e.target.value)}
                                style={{ width: '100%', minHeight: '60px', padding: '5px', borderRadius: '4px', border: '1px solid #ddd', fontFamily: 'inherit' }}
                            />
                            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                <button onClick={handleUpdatePost} style={{ background: '#0095f6', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
                                <button onClick={() => { setIsEditing(false); setEditedCaption(currentCaption); }} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <span className="caption-text">
                            {isExpanded ? currentCaption : (currentCaption?.substring(0, 120))}
                            {currentCaption?.length > 120 && !isExpanded && (
                                <span className="more-btn" onClick={() => setIsExpanded(true)} style={{ color: '#888', cursor: 'pointer' }}> ... more</span>
                            )}
                        </span>
                    )}
                </div>
                <div className="view-comments-btn" onClick={toggleComments}>
                    {Math.max(post.comments?.length || 0, comments.length) > 0 ? `View all ${Math.max(post.comments?.length || 0, comments.length)} comments` : 'View comments'}
                </div>
            </div>

            {/* Comments Section (Collapsible) */}
            {showComments && (
                <div className="comments-section">
                    <div className="comments-list">
                        {/* Top Level Comments */}
                        {comments.filter(c => !c.parentId).map(comment => (
                            <div key={comment._id} className="comment-wrapper">
                                <div className="comment-item">
                                    <img src={getProfilePic(comment.userId)} alt="" className="comment-avatar-mini" />
                                    <div className="comment-content">
                                        <div className="comment-bubble">
                                            <span className="comment-username">{getUserName(comment.userId)}</span>&nbsp;
                                            <span className="comment-text">{comment.text}</span>
                                        </div>
                                        <div className="comment-actions">
                                            <span className="action-time">{formatTime(comment.createdAt)}</span>
                                            <span 
                                                className={`action-link comment-like-btn ${comment.likes?.includes(currentUserId) ? 'active' : ''}`} 
                                                onClick={() => handleToggleCommentLike(comment._id)}
                                                title="Like comment"
                                            >
                                                <FiHeart fill={comment.likes?.includes(currentUserId) ? "#ed4956" : "none"} size={13} />
                                                <span className="count-label">{comment.likes?.length || 0}</span>
                                            </span>
                                            <span 
                                                className="action-link" 
                                                onClick={() => setReplyingTo({ id: comment._id, username: getUserName(comment.userId) })}
                                                title="Reply"
                                            >
                                                <FiMessageCircle size={13} /> Reply
                                            </span>
                                            {(isOwner || comment.userId?._id === currentUserId || comment.userId === currentUserId) && (
                                                <span 
                                                    className="action-link comment-delete-btn" 
                                                    onClick={() => handleDeleteComment(comment._id)} 
                                                    title="Delete"
                                                >
                                                    <FiTrash2 size={13} />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Replies */}
                                <div className="comment-replies-container">
                                    {comments.filter(c => c.parentId === comment._id).map(reply => (
                                        <div key={reply._id} className="comment-item comment-reply-nested">
                                            <FiCornerDownRight className="reply-arrow" size={14} />
                                            <img src={getProfilePic(reply.userId)} alt="" className="comment-avatar-mini" />
                                            <div className="comment-content">
                                                <div className="comment-bubble">
                                                    <span className="comment-username">{getUserName(reply.userId)}</span>&nbsp;
                                                    <span className="comment-text">{reply.text}</span>
                                                </div>
                                                <div className="comment-actions">
                                                    <span className="action-time">{formatTime(reply.createdAt)}</span>
                                                    <span 
                                                        className={`action-link comment-like-btn ${reply.likes?.includes(currentUserId) ? 'active' : ''}`} 
                                                        onClick={() => handleToggleCommentLike(reply._id)}
                                                        title="Like reply"
                                                    >
                                                        <FiHeart fill={reply.likes?.includes(currentUserId) ? "#ed4956" : "none"} size={12} />
                                                        <span className="count-label">{reply.likes?.length || 0}</span>
                                                    </span>
                                                    {(isOwner || reply.userId?._id === currentUserId || reply.userId === currentUserId) && (
                                                        <span 
                                                            className="action-link comment-delete-btn" 
                                                            onClick={() => handleDeleteComment(reply._id)} 
                                                            title="Delete"
                                                        >
                                                            <FiTrash2 size={12} />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {loadingComments && <p className="muted" style={{ fontSize: '0.8rem', paddingLeft: '10px' }}>Loading comments...</p>}
                    
                    {replyingTo && (
                        <div className="replying-to-banner">
                            <span>Replying to <b>@{replyingTo.username}</b></span>
                            <span className="cancel-reply" onClick={() => setReplyingTo(null)}>Cancel</span>
                        </div>
                    )}

                    <form className="comment-form" onSubmit={submitComment}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <FiSmile 
                                className="emoji-trigger" 
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                                style={{ cursor: 'pointer', marginRight: '10px', color: '#8e8e8e', fontSize: '1.2rem' }}
                            />
                            <AnimatePresence>
                                {showEmojiPicker && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        style={{ 
                                            position: 'absolute', 
                                            bottom: 'calc(100% + 15px)', 
                                            left: '-10px', 
                                            zIndex: 2000,
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                                            borderRadius: '12px',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <EmojiPicker 
                                            onEmojiClick={(emoji) => {
                                                setNewComment(prev => prev + emoji.emoji);
                                                setShowEmojiPicker(false);
                                            }}
                                            theme="light"
                                            width={300}
                                            height={400}
                                            searchDisabled={false}
                                            skinTonesDisabled={true}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <input
                            type="text"
                            placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button type="submit" disabled={!newComment.trim()}>{replyingTo ? 'Reply' : 'Post'}</button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Post;
