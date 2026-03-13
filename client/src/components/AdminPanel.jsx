import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './AdminPanel.css';

export default function AdminPanel() {
    const navigate = useNavigate();
    const currentUser = useMemo(() => {
        const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    }, []);
    
    const [activeTab, setActiveTab] = useState('verifications');
    const [pendingRequests, setPendingRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Redirect if not logged in
        if (!currentUser) {
            navigate('/login');
        } else {
            fetchPendingVerifications();
        }
    }, []);

    const fetchPendingVerifications = async () => {
        setIsLoading(true);
        try {
            const { data } = await API.get('/admin/verifications/pending');
            setPendingRequests(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch verification requests');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (userId, action) => {
        if (!window.confirm(`Are you sure you want to ${action} this verification request?`)) return;
        
        setIsLoading(true);
        setMessage('');
        setError('');
        
        try {
            await API.put(`/admin/verifications/${userId}/${action}`);
            setMessage(`Request ${action}d successfully.`);
            
            // Remove the user from the list
            setPendingRequests(prev => prev.filter(user => user._id !== userId));
            
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${action} request`);
        } finally {
            setIsLoading(false);
        }
    };

    const getProfileImg = (img) => {
        if (!img) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
        if (img.startsWith("http")) return img;
        return `${API.defaults.baseURL.replace('/api', '')}/images/${img.split('/').pop()}`;
    };
    if (!currentUser) return null;

    return (
        <div className="admin-container">
            <h2>Admin Dashboard</h2>
            
            <div className="admin-tabs" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <div 
                    className={`admin-tab ${activeTab === 'verifications' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('verifications'); setMessage(''); setError(''); }}
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: activeTab === 'verifications' ? '2px solid var(--secondary-color)' : 'none', fontWeight: activeTab === 'verifications' ? 'bold' : 'normal' }}
                >
                    Verification Requests ({pendingRequests.length})
                </div>
                {/* Add more admin tabs here in the future if needed */}
            </div>

            {message && <div style={{ padding: '10px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '5px', marginBottom: '15px' }}>{message}</div>}
            {error && <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '5px', marginBottom: '15px' }}>{error}</div>}

            {activeTab === 'verifications' && (
                <div className="admin-section">
                    <h3>Pending Blue Tick Requests</h3>
                    
                    {isLoading && pendingRequests.length === 0 ? (
                        <p>Loading requests...</p>
                    ) : pendingRequests.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>No pending verification requests at the moment.</p>
                    ) : (
                        <div className="verification-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {pendingRequests.map(user => (
                                <div key={user._id} className="verification-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', backgroundColor: 'var(--card-bg)', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <img 
                                            src={getProfileImg(user.profilePicture)} 
                                            alt={user.username} 
                                            style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} 
                                        />
                                        <div>
                                            <h4 style={{ margin: '0 0 5px 0' }}>{user.firstname} {user.lastname}</h4>
                                            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-secondary)' }}>@{user.username} • {user.email}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button 
                                            onClick={() => handleAction(user._id, 'approve')} 
                                            disabled={isLoading}
                                            style={{ padding: '8px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Approve ✔️
                                        </button>
                                        <button 
                                            onClick={() => handleAction(user._id, 'reject')} 
                                            disabled={isLoading}
                                            style={{ padding: '8px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Reject ❌
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
