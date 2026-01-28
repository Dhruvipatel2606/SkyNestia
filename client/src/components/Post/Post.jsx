import React, { useState, useEffect } from 'react';
import API from '../../api';
import './Post.css';

const Post = ({ post }) => {
    const [likes, setLikes] = useState(post.likes.length);
    const [isLiked, setIsLiked] = useState(false); // We need to check if current user liked it
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loadingComments, setLoadingComments] = useState(false);

    const currentUserStr = localStorage.getItem("user");
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const currentUserId = currentUser?._id;

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
                    text: post.description,
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
        if (user.firstname && user.lastname) return `${user.firstname} ${user.lastname}`;
        return user.username || 'Unknown User';
    };

    const getProfilePic = (user) => {
        return user?.profilePicture || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
    };

    return (
        <div className="post-card">
            <div className="post-header">
                <img className="post-avatar" src={getProfilePic(post.userId)} alt="avatar" />
                <div className="post-user-info">
                    <h4>{getUserName(post.userId)}</h4>
                    <span className="post-date">{new Date(post.createdAt).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="post-content">
                <p style={{ whiteSpace: 'pre-wrap' }}>{post.description}</p>

                {/* Images Grid */}
                {(post.images && post.images.length > 0) ? (
                    <div className={`post-images-grid grid-${Math.min(post.images.length, 4)}`}>
                        {post.images.map((img, i) => (
                            <img key={i} src={`${API.defaults.baseURL.replace('/api', '')}${img}`} alt="" className="post-img" />
                        ))}
                    </div>
                ) : post.image ? (
                    <img src={`${API.defaults.baseURL.replace('/api', '')}${post.image}`} alt="" className="post-single-img" />
                ) : null}

                {/* Music Player */}
                {post.music && (
                    <div className="post-music" style={{ marginTop: '10px', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                            <span>🎵</span>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>Music</span>
                        </div>
                        <audio controls src={post.music.startsWith('http') ? post.music : `${API.defaults.baseURL.replace('/api', '')}${post.music}`} style={{ width: '100%' }} />
                    </div>
                )}
            </div>

            <div className="post-footer">
                <button className={`post-action ${isLiked ? 'liked' : ''}`} onClick={handleLike}>
                    {isLiked ? '❤️' : '🤍'} {likes} {likes === 1 ? 'Like' : 'Likes'}
                </button>
                <button className="post-action" onClick={toggleComments}>
                    💬 Comment
                </button>
                <button className="post-action" onClick={handleWebShare}>
                    ↗ Share
                </button>
            </div>

            {showComments && (
                <div className="comments-section">
                    <form className="comment-form" onSubmit={submitComment}>
                        <input
                            type="text"
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                        />
                        <button type="submit" disabled={!newComment.trim()}>Post</button>
                    </form>

                    {loadingComments ? (
                        <p className="muted text-center">Loading comments...</p>
                    ) : (
                        <div className="comments-list">
                            {comments.map(comment => (
                                <div key={comment._id} className="comment-item">
                                    <img src={getProfilePic(comment.userId)} alt="" className="comment-avatar" />
                                    <div className="comment-bubble">
                                        <strong>{getUserName(comment.userId)}</strong>
                                        <p>{comment.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Post;
