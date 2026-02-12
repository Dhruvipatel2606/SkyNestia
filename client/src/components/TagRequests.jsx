import React, { useEffect, useState } from 'react';
import API from '../api';
import { useNavigate } from 'react-router-dom';

const TagRequests = () => {
    const [pendingTags, setPendingTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fadingPostId, setFadingPostId] = useState(null);
    const navigate = useNavigate();

    const currentUserRaw = localStorage.getItem('user');
    const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;

    useEffect(() => {
        fetchPendingTags();
    }, []);

    const fetchPendingTags = async () => {
        try {
            const res = await API.get('/post/tags/pending');
            setPendingTags(res.data);
        } catch (err) {
            console.error("Failed to fetch pending tags", err);
        } finally {
            setLoading(false);
        }
    };

    const handleTagAction = async (postId, status) => {
        try {
            setFadingPostId(postId);
            // Wait for animation to finish (e.g., 500ms)
            await new Promise(resolve => setTimeout(resolve, 500));

            await API.put(`/post/${postId}/tag`, { status });
            setPendingTags(prev => prev.filter(p => p._id !== postId));
        } catch (err) {
            console.error("Tag action failed", err);
            alert("Failed to update tag status");
        } finally {
            setFadingPostId(null);
        }
    };

    const getProfilePic = (user) => {
        return user?.profilePicture || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
    };

    const getPostImg = (post) => {
        const img = post.image || (post.images && post.images[0]);
        if (!img) return null;
        if (img.startsWith("http")) return img;
        const filename = img.split('/').pop();
        return `http://localhost:5000/images/${filename}`;
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', marginRight: '15px' }}>
                    &#8592;
                </button>
                <h2 style={{ margin: 0 }}>Tag Requests</h2>
            </div>

            {pendingTags.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <p>No pending tag requests.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {pendingTags.map(post => (
                        <div key={post._id} style={{
                            border: '1px solid #eee',
                            padding: '15px',
                            borderRadius: '12px',
                            background: '#fff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            transition: 'all 0.5s ease',
                            opacity: fadingPostId === post._id ? 0 : 1,
                            transform: fadingPostId === post._id ? 'translateX(20px)' : 'translateX(0)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <img src={getProfilePic(post.userId)} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} alt="av" />
                                <div>
                                    <strong style={{ display: 'block' }}>{post.userId?.username || 'Unknown User'}</strong>
                                    <span style={{ fontSize: '0.9em', color: '#666' }}>tagged you in a post</span>
                                </div>
                            </div>

                            {getPostImg(post) && (
                                <div style={{ height: '200px', background: '#f0f0f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px' }}>
                                    <img src={getPostImg(post)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="post content" />
                                </div>
                            )}

                            {post.caption && <p style={{ margin: '0 0 15px 0', color: '#333' }}>{post.caption}</p>}

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => handleTagAction(post._id, 'approved')}
                                    style={{ flex: 1, padding: '10px', background: '#0095f6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => handleTagAction(post._id, 'rejected')}
                                    style={{ flex: 1, padding: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TagRequests;
