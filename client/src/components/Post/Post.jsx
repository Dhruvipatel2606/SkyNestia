import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../api';
import './Post.css';
import { FiHeart, FiMessageCircle, FiSend, FiBookmark, FiMoreHorizontal, FiUser } from 'react-icons/fi';

const Post = ({ post }) => {
    const navigate = useNavigate();
    const [likes, setLikes] = useState(post.likes.length);
    const [isLiked, setIsLiked] = useState(false); // We need to check if current user liked it
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showTags, setShowTags] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    const currentUserStr = localStorage.getItem("user");
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
        if (post.likes.includes(currentUserId)) {
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
                // If we are on the dedicated post page, go back to profile. 
                // If we are on feed/profile, we might want to just reload or update state, 
                // but user explicitly asked to "go to profile page directly".
                navigate('/profile');
                // Optionally reload if we are already on profile to refresh list? 
                // Since navigate to same route might not refresh, we might need window.location.href = '/profile' or similar 
                // if we want a full refresh, but navigate is smoother. 
                // However, without state management update, the post might still show if we just navigate.
                // Let's use window.location.href = '/profile' to ensure a re-fetch of the profile posts.
                window.location.href = '/profile';
            } catch (err) {
                console.error("Delete error", err);
                alert("Failed to delete post.");
            }
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
                    url: window.location.href, // Or specific post URL if you have routed post details
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
                text: newComment
            });
            setComments(prev => [res.data, ...prev]);
            setNewComment("");
        } catch (err) {
            console.error("Comment error", err);
        }
    };

    const getUserName = (user) => {
        if (!user) return 'Unknown User';
        return user.username || 'Unknown User'; // Prefer username for this style
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

    return (
        <div className="post-card">
            {/* Header */}
            <div className="post-header">
                <Link to={`/profile/${post.userId._id}`} className="post-header-user">
                    <div className="story-ring">
                        <img className="post-avatar" src={getProfilePic(post.userId)} alt="avatar" />
                    </div>
                    <div className="post-info-text">
                        <span className="post-username">{getUserName(post.userId)}</span>
                        <span className="post-time">• {formatTime(post.createdAt)}</span>
                    </div>
                </Link>
                <div className="post-options" style={{ position: 'relative' }}>
                    <button className="icon-btn" onClick={() => setShowOptions(!showOptions)}><FiMoreHorizontal /></button>
                    {showOptions && (
                        <div className="options-menu">
                            {isOwner && (
                                <div className="option-item delete" onClick={handleDelete}>Delete</div>
                            )}
                            <div className="option-item" onClick={() => setShowOptions(false)}>Cancel</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content (Image) */}
            {/* Content (Image) */}
            <div className="post-content-visual" style={{ position: 'relative' }}>
                {(post.images && post.images.length > 0) ? (
                    <div className={`post-images-grid grid-${Math.min(post.images.length, 4)}`}>
                        {post.images.map((img, i) => (
                            <img key={i} src={`${API.defaults.baseURL.replace('/api', '')}${img}`} alt="" className="post-img" />
                        ))}
                    </div>
                ) : post.image ? (
                    <img src={`${API.defaults.baseURL.replace('/api', '')}${post.image}`} alt="" className="post-single-img" />
                ) : null}

                {/* Tagged Users Indicator and Overlay */}
                {post.tags && post.tags.length > 0 && (
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
                                    {post.tags.map((tag, idx) => (
                                        <Link
                                            to={`/profile/${tag.userId?._id}`}
                                            key={idx}
                                            className="tagged-user-link"
                                        >
                                            {tag.userId?.username || tag.userId?.firstname || "Unknown User"}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Music Player */}
                {post.music && (
                    <div className="post-music-indicator">
                        <span>🎵 Music</span>
                        <audio controls src={post.music.startsWith('http') ? post.music : `${API.defaults.baseURL.replace('/api', '')}${post.music}`} />
                    </div>
                )}
            </div>

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
                    <span className="caption-text">
                        {isExpanded ? post.caption : (post.caption?.substring(0, 120))}
                        {post.caption?.length > 120 && !isExpanded && (
                            <span className="more-btn" onClick={() => setIsExpanded(true)}> ... more</span>
                        )}
                    </span>
                </div>
                <div className="view-comments-btn" onClick={toggleComments}>
                    {comments.length > 0 ? `View all ${comments.length} comments` : 'View comments'}
                </div>
            </div>

            {/* Comments Section (Collapsible) */}
            {showComments && (
                <div className="comments-section">
                    <div className="comments-list">
                        {comments.map(comment => (
                            <div key={comment._id} className="comment-item">
                                <span className="comment-username">{getUserName(comment.userId)}</span>
                                <span className="comment-text">{comment.text}</span>
                            </div>
                        ))}
                    </div>
                    {loadingComments && <p className="muted" style={{ fontSize: '0.8rem' }}>Loading...</p>}
                    <form className="comment-form" onSubmit={submitComment}>
                        <input
                            type="text"
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button type="submit" disabled={!newComment.trim()}>Post</button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Post;
