import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './Profile.css'; // Reuse profile grid styles

const SavedPosts = () => {
    const [savedPosts, setSavedPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSaved = async () => {
            try {
                const res = await API.get('/post/saved');
                setSavedPosts(res.data);
            } catch (error) {
                console.error("Failed to fetch saved posts", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSaved();
    }, []);

    const getPostImg = (post) => {
        const img = post.image || (post.images && post.images[0]);
        if (!img) return null;
        if (img.startsWith("http")) return img;
        return `${API.defaults.baseURL.replace('/api', '')}${img}`;
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px', color: '#2563eb' }}>Loading Saved Posts...</div>;

    return (
        <div className="profile-container" style={{ paddingTop: '2rem' }}>
            <div className="section-header" style={{ marginBottom: '20px' }}>
                <span className="section-title">Saved</span>
                <span className="badge" style={{ background: '#64748b', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', marginLeft: '10px' }}>Only you can see what you've saved</span>
            </div>

            <div className="photos-grid">
                {savedPosts.map(post => {
                    const imgUrl = getPostImg(post);
                    return (
                        <div key={post._id} className="photo-item" onClick={() => navigate(`/post/${post._id}`)}>
                            {imgUrl ? (
                                <img
                                    src={imgUrl}
                                    alt="saved"
                                    className="photo-img"
                                    onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=Error"; }}
                                />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '0.8rem', padding: '5px', textAlign: 'center', background: '#f1f5f9' }}>
                                    {post.caption?.substring(0, 30)}...
                                </div>
                            )}
                        </div>
                    )
                })}
                {savedPosts.length === 0 && (
                    <div className="empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                        <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Save Photos</p>
                        <p style={{ color: '#64748b' }}>Save photos and videos that you want to see again. No one is notified, and only you can see what you've saved.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SavedPosts;
