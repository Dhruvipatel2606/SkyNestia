import React, { useState, useEffect, useCallback } from 'react';
import API from '../../api';
import { FiSearch, FiSlash, FiLock } from 'react-icons/fi';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null);
    const [restrictModal, setRestrictModal] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 15 });
            if (search) params.set('search', search);
            if (statusFilter) params.set('status', statusFilter);
            const { data } = await API.get(`/admin/users?${params}`);
            setUsers(data.users);
            setTotalPages(data.totalPages);
            setTotal(data.total);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleStatusChange = async (userId, newStatus) => {
        const label = newStatus === 'suspended' ? 'suspend' : newStatus === 'banned' ? 'ban' : 'activate';
        if (!window.confirm(`Are you sure you want to ${label} this user?`)) return;
        setActionLoading(userId);
        setMessage(''); setError('');
        try {
            if (newStatus === 'banned') {
                await API.put(`/admin/users/${userId}/ban`, { reason: 'Admin action' });
            } else {
                await API.put(`/admin/users/${userId}/status`, { accountStatus: newStatus });
            }
            setMessage(`User ${label}${label.endsWith('e') ? 'd' : 'ed'} successfully.`);
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, accountStatus: newStatus } : u));
        } catch (err) {
            setError(err.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRestrict = async (userId) => {
        setActionLoading(userId);
        setMessage(''); setError('');
        try {
            const { data } = await API.put(`/admin/users/${userId}/restrict`, restrictModal.restrictions);
            setMessage('Restrictions updated.');
            setRestrictModal(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update restrictions');
        } finally {
            setActionLoading(null);
        }
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

            {/* Restrict Modal */}
            {restrictModal && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={() => setRestrictModal(null)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#1a1d28', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400 }}>
                        <h3 style={{ margin: '0 0 20px', color: '#f1f5f9', fontSize: '1.1rem' }}>
                            <FiLock style={{ marginRight: 8, verticalAlign: 'middle' }} />
                            Restrict @{restrictModal.username}
                        </h3>
                        {['canPost', 'canComment', 'canMessage'].map(key => (
                            <label key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#cbd5e1', fontSize: '0.92rem', cursor: 'pointer' }}>
                                <span>{key === 'canPost' ? 'Can create posts' : key === 'canComment' ? 'Can comment' : 'Can send messages'}</span>
                                <input
                                    type="checkbox"
                                    checked={restrictModal.restrictions[key]}
                                    onChange={e => setRestrictModal(prev => ({ ...prev, restrictions: { ...prev.restrictions, [key]: e.target.checked } }))}
                                    style={{ accentColor: '#60a5fa', width: 18, height: 18 }}
                                />
                            </label>
                        ))}
                        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
                            <button className="admin-action-btn" onClick={() => setRestrictModal(null)}>Cancel</button>
                            <button
                                className="admin-action-btn approve"
                                onClick={() => handleRestrict(restrictModal.userId)}
                                disabled={actionLoading === restrictModal.userId}
                            >
                                {actionLoading === restrictModal.userId ? '...' : 'Save Restrictions'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="admin-section-card">
                <div className="admin-section-header">
                    <h3>All Users ({total})</h3>
                </div>
                <div className="admin-section-body">
                    <div className="admin-search-bar">
                        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                            <FiSearch style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                            <input className="admin-search-input" style={{ paddingLeft: 40 }} placeholder="Search by name, username, or email..." value={searchInput} onChange={e => setSearchInput(e.target.value)} id="admin-user-search" />
                        </div>
                        <select className="admin-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} id="admin-status-filter">
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="banned">Banned</option>
                            <option value="deactivated">Deactivated</option>
                        </select>
                    </div>

                    {loading ? (
                        <div className="admin-loading"><div className="admin-spinner"></div> Loading users...</div>
                    ) : users.length === 0 ? (
                        <div className="admin-empty"><div className="admin-empty-icon">👤</div><p>No users found.</p></div>
                    ) : (
                        <>
                            <div className="admin-table-responsive">
                                <table className="admin-table">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Status</th>
                                            <th>Role</th>
                                            <th>Followers</th>
                                            <th>Joined</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(user => (
                                            <tr key={user._id}>
                                                <td>
                                                    <div className="admin-table-user">
                                                        <img src={getProfileImg(user.profilePicture)} alt="" className="admin-table-avatar" onError={e => { e.target.onerror = null; e.target.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; }} />
                                                        <div className="admin-table-userinfo">
                                                            <span className="admin-table-username">
                                                                {user.firstname ? `${user.firstname} ${user.lastname || ''}` : user.username}
                                                                {user.isVerified && <span title="Verified" style={{ marginLeft: 4, color: '#60a5fa' }}>✓</span>}
                                                            </span>
                                                            <span className="admin-table-email">@{user.username} · {user.email}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`admin-badge ${user.accountStatus}`}>{user.accountStatus}</span>
                                                </td>
                                                <td>
                                                    {user.isAdmin ? <span className="admin-badge admin-role">Admin</span> : <span style={{ color: '#64748b', fontSize: '0.85rem' }}>User</span>}
                                                </td>
                                                <td><span style={{ color: '#94a3b8' }}>{user.followersCount}</span></td>
                                                <td><span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{formatDate(user.createdAt)}</span></td>
                                                <td style={{ textAlign: 'right' }}>
                                                    {!user.isAdmin && (
                                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                            {/* Restrict */}
                                                            <button
                                                                className="admin-action-btn"
                                                                title="Restrict"
                                                                onClick={() => setRestrictModal({ userId: user._id, username: user.username, restrictions: { canPost: true, canComment: true, canMessage: true } })}
                                                            >
                                                                <FiLock style={{ marginRight: 3 }} /> Restrict
                                                            </button>

                                                            {/* Status actions */}
                                                            {user.accountStatus === 'active' && (
                                                                <>
                                                                    <button className="admin-action-btn suspend" onClick={() => handleStatusChange(user._id, 'suspended')} disabled={actionLoading === user._id}>
                                                                        {actionLoading === user._id ? '...' : 'Suspend'}
                                                                    </button>
                                                                    <button className="admin-action-btn reject" onClick={() => handleStatusChange(user._id, 'banned')} disabled={actionLoading === user._id}>
                                                                        <FiSlash style={{ marginRight: 3 }} />{actionLoading === user._id ? '...' : 'Ban'}
                                                                    </button>
                                                                </>
                                                            )}
                                                            {(user.accountStatus === 'suspended' || user.accountStatus === 'banned') && (
                                                                <button className="admin-action-btn activate" onClick={() => handleStatusChange(user._id, 'active')} disabled={actionLoading === user._id}>
                                                                    {actionLoading === user._id ? '...' : 'Activate'}
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
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
