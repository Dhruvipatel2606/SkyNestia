import React, { useState, useEffect } from 'react';
import API from '../api';
import { Link } from 'react-router-dom';
import { FiSearch, FiUser, FiHash, FiImage, FiHeart, FiMessageCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const Search = () => {
    const [query, setQuery] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [postResults, setPostResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all'); // all, users, posts

    const performSearch = async (val) => {
        if (!val.trim()) {
            setUserResults([]);
            setPostResults([]);
            return;
        }
        setLoading(true);
        try {
            const [userRes, postRes] = await Promise.all([
                API.get(`/user/search?q=${val}`),
                API.get(`/post/search?query=${val}`)
            ]);
            setUserResults(userRes.data || []);
            setPostResults(postRes.data || []);
        } catch (err) {
            console.error("Search error", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchInput = (e) => {
        const val = e.target.value;
        setQuery(val);
        // Add minimal debounce or just search after 2 chars
        if (val.length > 2) {
            performSearch(val);
        }
    };

    const UserItem = ({ user }) => (
        <Link to={`/profile/${user._id}`} style={{ 
            display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', 
            background: '#f8fafc', borderRadius: '12px', textDecoration: 'none', color: 'inherit',
            transition: 'background 0.2s'
        }} className="search-result-user">
            <img 
                src={user.profilePicture ? (user.profilePicture.startsWith('http') ? user.profilePicture : `${API.defaults.baseURL.replace('/api', '')}/images/${user.profilePicture.split('/').pop()}`) : "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                 style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                 alt={user.username}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 'bold' }}>{user.username}</span>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>{user.firstname} {user.lastname}</span>
            </div>
        </Link>
    );

    const PostItem = ({ post }) => (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={post._id} 
            className="search-post-card"
            style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', borderRadius: '8px' }}
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
                <div style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.3)', opacity: 0, transition: 'opacity 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', color: 'white'
                }} className="search-post-overlay">
                     <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FiHeart fill="white" size={16} /> {post.likes?.length || 0}
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FiMessageCircle fill="white" size={16} /> {post.comments?.length || 0}
                     </div>
                </div>
            </Link>
        </motion.div>
    );

    return (
        <div style={{ maxWidth: '1250px', margin: '0 auto', padding: '30px 20px' }}>
            <div style={{ 
                background: '#f1f5f9', borderRadius: '15px', padding: '15px 20px', 
                display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px',
                border: loading ? '1px solid #0095f6' : '1px solid transparent'
            }}>
                <FiSearch color={loading ? '#0095f6' : '#64748b'} size={20} />
                <input 
                    type="text"
                    placeholder="Search users, posts or hashtags (starts with #)..."
                    value={query}
                    onChange={handleSearchInput}
                    style={{ background: 'none', border: 'none', outline: 'none', width: '100%', fontSize: '1.1rem' }}
                    autoFocus
                />
                {loading && <div className="spinner-mini" style={{ width: '15px', height: '15px', border: '2px solid #ccc', borderTopColor: '#0095f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>}
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', borderBottom: '1px solid #eee' }}>
                {['all', 'users', 'posts'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveFilter(tab)}
                        style={{
                            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
                            color: activeFilter === tab ? '#0095f6' : '#666',
                            borderBottom: activeFilter === tab ? '2px solid #0095f6' : 'none',
                            fontWeight: 'bold', textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <AnimatePresence>
                {/* Users Section */}
                {(activeFilter === 'all' || activeFilter === 'users') && userResults.length > 0 && (
                    <div style={{ marginBottom: '40px' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiUser size={18} /> People
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                            {userResults.map(u => <UserItem key={u._id} user={u} />)}
                        </div>
                    </div>
                )}

                {/* Posts Section */}
                {(activeFilter === 'all' || activeFilter === 'posts') && postResults.length > 0 && (
                    <div>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {query.startsWith('#') ? <FiHash size={18} /> : <FiImage size={18} />} Posts
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                            {postResults.map(p => <PostItem key={p._id} post={p} />)}
                        </div>
                    </div>
                )}

                {query.length > 2 && userResults.length === 0 && postResults.length === 0 && !loading && (
                    <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                        No results found for "{query}"
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .search-result-user:hover { background: #f1f5f9 !important; }
                .search-post-card:hover .search-post-overlay { opacity: 1 !important; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Search;
