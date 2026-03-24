import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';
import { FiSearch, FiTrash2, FiAlertTriangle } from 'react-icons/fi';

export default function AdminPosts() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [flaggedOnly, setFlaggedOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 12 });
            if (search) params.set('search', search);
            if (flaggedOnly) params.set('flagged', 'true');

            const { data } = await API.get(`/admin/posts?${params}`);
            setPosts(data.posts);
            setTotalPages(data.totalPages);
            setTotal(data.total);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch posts');
        } finally {
            setLoading(false);
        }
    }, [page, search, flaggedOnly]);

    useEffect(() => { fetchPosts(); }, [fetchPosts]);

    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleDelete = async (postId) => {
        if (!window.confirm('Are you sure you want to permanently delete this post?')) return;
        setActionLoading(postId);
        setMessage('');
        setError('');
        try {
            await API.delete(`/admin/posts/${postId}`);
            setMessage('Post deleted successfully.');
            setPosts(prev => prev.filter(p => p._id !== postId));
            setTotal(prev => prev - 1);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete post');
        } finally {
            setActionLoading(null);
        }
    };

    const getPostImage = (post) => {
        const img = post.images?.[0] || post.image;
        if (!img) return null;
        if (img.startsWith('http')) return img;
        return `http://localhost:5000${img}`;
    };

    const getProfileImg = (img) => {
        if (!img) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
        if (img.startsWith("http")) return img;
        return `http://localhost:5000/images/${img.split('/').pop()}`;
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return (
        <>
            {message && <div className="admin-toast success">✓ {message}</div>}
            {error && <div className="admin-toast error">⚠️ {error}</div>}

            <div className="admin-section-card">
                <div className="admin-section-header">
                    <h3>All Posts ({total})</h3>
                </div>
                <div className="admin-section-body">
                    <div className="admin-search-bar">
                        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                            <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                            <input
                                className="admin-search-input"
                                style={{ paddingLeft: 40 }}
                                placeholder="Search captions..."
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                            />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: '0.88rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={flaggedOnly}
                                onChange={e => { setFlaggedOnly(e.target.checked); setPage(1); }}
                                style={{ accentColor: '#f43f5e' }}
                            />
                            <FiAlertTriangle style={{ color: '#f87171' }} /> Flagged only
                        </label>
                    </div>

                    {loading ? (
                        <div className="admin-loading"><div className="admin-spinner"></div> Loading posts...</div>
                    ) : posts.length === 0 ? (
                        <div className="admin-empty">
                            <div className="admin-empty-icon">📝</div>
                            <p>No posts found.</p>
                        </div>
                    ) : (
                        <>
                            <div className="admin-table-responsive">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>Post</th>
                                            <th>Author</th>
                                            <th>Likes</th>
                                            <th>Reports</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {posts.map(post => (
                                            <tr key={post._id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        {getPostImage(post) && (
                                                            <img
                                                                src={getPostImage(post)}
                                                                alt=""
                                                                style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}
                                                                onError={e => { e.target.style.display = 'none'; }}
                                                            />
                                                        )}
                                                        <span style={{ color: '#cbd5e1', fontSize: '0.88rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                                            {post.caption || '(no caption)'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="admin-table-user">
                                                        <img
                                                            src={getProfileImg(post.userId?.profilePicture)}
                                                            alt=""
                                                            className="admin-table-avatar"
                                                            style={{ width: 30, height: 30 }}
                                                            onError={e => { e.target.onerror = null; e.target.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; }}
                                                        />
                                                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>@{post.userId?.username || '?'}</span>
                                                    </div>
                                                </td>
                                                <td><span style={{ color: '#94a3b8' }}>{post.likesCount}</span></td>
                                                <td>
                                                    {post.reportCount > 0 ? (
                                                        <span className="admin-badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>
                                                            {post.reportCount} report{post.reportCount > 1 ? 's' : ''}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#475569' }}>0</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {!post.isSafe ? (
                                                        <span className="admin-badge" style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>Flagged</span>
                                                    ) : (
                                                        <span className="admin-badge active">Safe</span>
                                                    )}
                                                </td>
                                                <td><span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{formatDate(post.createdAt)}</span></td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button
                                                        className="admin-action-btn reject"
                                                        onClick={() => handleDelete(post._id)}
                                                        disabled={actionLoading === post._id}
                                                        title="Delete post"
                                                    >
                                                        <FiTrash2 style={{ marginRight: 4 }} />
                                                        {actionLoading === post._id ? '...' : 'Delete'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="admin-pagination">
                                    <button className="admin-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pn = totalPages <= 5 ? i + 1 : (page <= 3 ? i + 1 : (page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i));
                                        return <button key={pn} className={`admin-page-btn ${page === pn ? 'active-page' : ''}`} onClick={() => setPage(pn)}>{pn}</button>;
                                    })}
                                    <button className="admin-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                                    <span className="admin-page-info">Page {page} of {totalPages}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
