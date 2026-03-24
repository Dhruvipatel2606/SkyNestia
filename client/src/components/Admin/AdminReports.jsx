import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';
import { FiTrash2 } from 'react-icons/fi';

const REASON_LABELS = {
    spam: 'Spam',
    harassment: 'Harassment',
    inappropriate: 'Inappropriate',
    hate_speech: 'Hate Speech',
    violence: 'Violence',
    misinformation: 'Misinformation',
    other: 'Other'
};

export default function AdminReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [typeFilter, setTypeFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 12 });
            if (statusFilter) params.set('status', statusFilter);
            if (typeFilter) params.set('targetType', typeFilter);

            const { data } = await API.get(`/admin/reports?${params}`);
            setReports(data.reports);
            setTotalPages(data.totalPages);
            setTotal(data.total);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch reports');
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter, typeFilter]);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    const handleReview = async (reportId, status) => {
        setActionLoading(reportId);
        setMessage(''); setError('');
        try {
            await API.put(`/admin/reports/${reportId}/review`, { status });
            setMessage(`Report ${status} successfully.`);
            setReports(prev => prev.map(r => r._id === reportId ? { ...r, status } : r));
        } catch (err) {
            setError(err.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeletePost = async (postId, reportId) => {
        if (!window.confirm('Delete this reported post permanently?')) return;
        setActionLoading(reportId);
        try {
            await API.delete(`/admin/posts/${postId}`);
            setMessage('Post deleted and report resolved.');
            setReports(prev => prev.map(r => r._id === reportId ? { ...r, status: 'reviewed' } : r));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete post');
        } finally {
            setActionLoading(null);
        }
    };

    const handleBanUser = async (userId, reportId) => {
        if (!window.confirm('Ban this user?')) return;
        setActionLoading(reportId);
        try {
            await API.put(`/admin/users/${userId}/ban`, { reason: 'Reported for violations' });
            setMessage('User banned and report resolved.');
            await handleReview(reportId, 'reviewed');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to ban user');
        } finally {
            setActionLoading(null);
        }
    };

    const getProfileImg = (img) => {
        if (!img) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
        if (img.startsWith("http")) return img;
        return `http://localhost:5000/images/${img.split('/').pop()}`;
    };

    const getPostImage = (post) => {
        if (!post) return null;
        const img = post.images?.[0] || post.image;
        if (!img) return null;
        if (img.startsWith('http')) return img;
        return `http://localhost:5000${img}`;
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    return (
        <>
            {message && <div className="admin-toast success">✓ {message}</div>}
            {error && <div className="admin-toast error">⚠️ {error}</div>}

            <div className="admin-section-card">
                <div className="admin-section-header">
                    <h3>Reports ({total})</h3>
                </div>
                <div className="admin-section-body">
                    <div className="admin-search-bar">
                        <select className="admin-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                            <option value="">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="dismissed">Dismissed</option>
                        </select>
                        <select className="admin-filter-select" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
                            <option value="">All Types</option>
                            <option value="post">Posts</option>
                            <option value="user">Users</option>
                        </select>
                    </div>

                    {loading ? (
                        <div className="admin-loading"><div className="admin-spinner"></div> Loading reports...</div>
                    ) : reports.length === 0 ? (
                        <div className="admin-empty">
                            <div className="admin-empty-icon">🛡️</div>
                            <p>No reports found.</p>
                        </div>
                    ) : (
                        <div className="admin-verification-list">
                            {reports.map(report => (
                                <div key={report._id} className="admin-verification-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 14 }}>
                                    {/* Header row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span className={`admin-badge ${report.status === 'pending' ? 'deactivated' : report.status === 'reviewed' ? 'active' : 'suspended'}`}>
                                                {report.status}
                                            </span>
                                            <span className="admin-badge" style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa' }}>
                                                {report.targetType}
                                            </span>
                                            <span className="admin-badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}>
                                                {REASON_LABELS[report.reason] || report.reason}
                                            </span>
                                        </div>
                                        <span style={{ color: '#475569', fontSize: '0.78rem' }}>{formatDate(report.createdAt)}</span>
                                    </div>

                                    {/* Reporter info */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#94a3b8' }}>
                                        <span>Reported by</span>
                                        <img src={getProfileImg(report.reporterId?.profilePicture)} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                                        <strong style={{ color: '#cbd5e1' }}>@{report.reporterId?.username || '?'}</strong>
                                    </div>

                                    {report.description && (
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem', fontStyle: 'italic', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                                            "{report.description}"
                                        </p>
                                    )}

                                    {/* Target preview */}
                                    {report.targetData && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
                                            {report.targetType === 'post' ? (
                                                <>
                                                    {getPostImage(report.targetData) && (
                                                        <img src={getPostImage(report.targetData)} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.style.display = 'none'; }} />
                                                    )}
                                                    <div>
                                                        <div style={{ color: '#cbd5e1', fontSize: '0.88rem', marginBottom: 2 }}>
                                                            {report.targetData.caption ? report.targetData.caption.substring(0, 120) : '(no caption)'}
                                                        </div>
                                                        <div style={{ color: '#475569', fontSize: '0.78rem' }}>
                                                            by @{report.targetData.userId?.username || '?'}
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <img src={getProfileImg(report.targetData.profilePicture)} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                                    <div>
                                                        <div style={{ color: '#cbd5e1', fontWeight: 600 }}>@{report.targetData.username}</div>
                                                        <div style={{ color: '#475569', fontSize: '0.8rem' }}>{report.targetData.email}</div>
                                                    </div>
                                                    <span className={`admin-badge ${report.targetData.accountStatus}`} style={{ marginLeft: 'auto' }}>
                                                        {report.targetData.accountStatus}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {report.status === 'pending' && (
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                            {report.targetType === 'post' && report.targetData && (
                                                <button
                                                    className="admin-action-btn reject"
                                                    onClick={() => handleDeletePost(report.targetId, report._id)}
                                                    disabled={actionLoading === report._id}
                                                >
                                                    <FiTrash2 style={{ marginRight: 4 }} /> Delete Post
                                                </button>
                                            )}
                                            {report.targetType === 'user' && report.targetData && (
                                                <button
                                                    className="admin-action-btn suspend"
                                                    onClick={() => handleBanUser(report.targetId, report._id)}
                                                    disabled={actionLoading === report._id}
                                                >
                                                    Ban User
                                                </button>
                                            )}
                                            <button
                                                className="admin-action-btn approve"
                                                onClick={() => handleReview(report._id, 'reviewed')}
                                                disabled={actionLoading === report._id}
                                            >
                                                ✓ Mark Reviewed
                                            </button>
                                            <button
                                                className="admin-action-btn"
                                                onClick={() => handleReview(report._id, 'dismissed')}
                                                disabled={actionLoading === report._id}
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="admin-pagination" style={{ marginTop: 20 }}>
                            <button className="admin-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                            <span className="admin-page-info">Page {page} of {totalPages}</span>
                            <button className="admin-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
