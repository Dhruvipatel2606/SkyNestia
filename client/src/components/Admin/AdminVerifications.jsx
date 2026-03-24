import React, { useState, useEffect } from 'react';
import API from '../../api';

export default function AdminVerifications() {
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        try {
            const { data } = await API.get('/admin/verifications/pending');
            setPendingRequests(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch verification requests');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (userId, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this verification request?`)) return;

        setActionLoading(userId);
        setMessage('');
        setError('');

        try {
            await API.put(`/admin/verifications/${userId}/${action}`);
            setMessage(`Verification ${action}d successfully.`);
            setPendingRequests(prev => prev.filter(u => u._id !== userId));
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${action} request`);
        } finally {
            setActionLoading(null);
        }
    };

    const getProfileImg = (img) => {
        if (!img) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
        if (img.startsWith("http")) return img;
        return `http://localhost:5000/images/${img.split('/').pop()}`;
    };

    if (loading) {
        return <div className="admin-loading"><div className="admin-spinner"></div> Loading verification requests...</div>;
    }

    return (
        <>
            {message && <div className="admin-toast success">✓ {message}</div>}
            {error && <div className="admin-toast error">⚠️ {error}</div>}

            <div className="admin-section-card">
                <div className="admin-section-header">
                    <h3>Pending Blue Tick Requests ({pendingRequests.length})</h3>
                </div>
                <div className="admin-section-body">
                    {pendingRequests.length === 0 ? (
                        <div className="admin-empty">
                            <div className="admin-empty-icon">✅</div>
                            <p>No pending verification requests at the moment.</p>
                        </div>
                    ) : (
                        <div className="admin-verification-list">
                            {pendingRequests.map(user => (
                                <div key={user._id} className="admin-verification-item">
                                    <div className="admin-verification-user">
                                        <img
                                            src={getProfileImg(user.profilePicture)}
                                            alt={user.username}
                                            className="admin-verification-avatar"
                                            onError={(e) => { e.target.onerror = null; e.target.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; }}
                                        />
                                        <div className="admin-verification-info">
                                            <h4>{user.firstname} {user.lastname}</h4>
                                            <p>@{user.username} · {user.email}</p>
                                        </div>
                                    </div>
                                    <div className="admin-verification-actions">
                                        <button
                                            className="admin-action-btn approve"
                                            onClick={() => handleAction(user._id, 'approve')}
                                            disabled={actionLoading === user._id}
                                        >
                                            {actionLoading === user._id ? '...' : '✓ Approve'}
                                        </button>
                                        <button
                                            className="admin-action-btn reject"
                                            onClick={() => handleAction(user._id, 'reject')}
                                            disabled={actionLoading === user._id}
                                        >
                                            {actionLoading === user._id ? '...' : '✕ Reject'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
