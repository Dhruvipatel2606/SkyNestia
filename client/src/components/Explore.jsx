import React, { useState, useEffect } from 'react';
import API from '../api';
import './Post/Post.css'; 
import { Link } from 'react-router-dom';
import { FiTrendingUp, FiCompass, FiHeart, FiMessageCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';

const Explore = () => {
    const [explorePosts, setExplorePosts] = useState([]);
    const [trendingPosts, setTrendingPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('explore');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [exploreRes, trendingRes] = await Promise.all([
                    API.get('/post/explore'),
                    API.get('/post/trending')
                ]);
                setExplorePosts(exploreRes.data);
                setTrendingPosts(trendingRes.data);
            } catch (err) {
                console.error("Failed to fetch explore/trending", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const PostGrid = ({ posts }) => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px', padding: '10px' }}>
            {posts.map((post) => (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={post._id} 
                    className="explore-post-card"
                    style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', borderRadius: '8px', cursor: 'pointer' }}
                >
                    <Link to={`/post/${post._id}`}>
                        <img 
                            src={post.images && post.images.length > 0 
                                ? `${API.defaults.baseURL.replace('/api', '')}${post.images[0]}`
                                : post.image ? `${API.defaults.baseURL.replace('/api', '')}${post.image}` : "https://via.placeholder.com/300"
                            } 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div className="explore-overlay" style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                            background: 'rgba(0,0,0,0.3)', opacity: 0, transition: 'opacity 0.2s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', color: 'white'
                        }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <FiHeart fill="white" /> {post.likes?.length || 0}
                             </div>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <FiMessageCircle fill="white" /> {post.comments?.length || 0}
                             </div>
                        </div>
                    </Link>
                </motion.div>
            ))}
        </div>
    );

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <header style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div 
                    onClick={() => setActiveTab('explore')}
                    style={{ 
                        cursor: 'pointer', paddingBottom: '10px', 
                        borderBottom: activeTab === 'explore' ? '2px solid #0095f6' : 'none',
                        color: activeTab === 'explore' ? '#0095f6' : '#666',
                        display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'
                    }}
                >
                    <FiCompass /> Explore
                </div>
                <div 
                    onClick={() => setActiveTab('trending')}
                    style={{ 
                        cursor: 'pointer', paddingBottom: '10px', 
                        borderBottom: activeTab === 'trending' ? '2px solid #ed4956' : 'none',
                        color: activeTab === 'trending' ? '#ed4956' : '#666',
                        display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'
                    }}
                >
                    <FiTrendingUp /> Trending
                </div>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>
            ) : (
                <PostGrid posts={activeTab === 'explore' ? explorePosts : trendingPosts} />
            )}

            <style>{`
                .explore-post-card:hover .explore-overlay {
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    );
};

export default Explore;
