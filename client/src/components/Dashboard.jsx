import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import API from '../api'

export default function Dashboard() {
    const navigate = useNavigate()
    const raw = localStorage.getItem('user')
    const user = raw ? JSON.parse(raw) : null

    const [tagRequests, setTagRequests] = useState([]);

    useEffect(() => {
        if (!user) return;
        fetchTagRequests();
    }, []);

    const fetchTagRequests = async () => {
        try {
            const res = await API.get('/post/tags/pending');
            setTagRequests(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleTagAction = async (postId, status) => {
        try {
            await API.put(`/post/${postId}/tag`, { status });
            // Remove from list
            setTagRequests(prev => prev.filter(p => p._id !== postId));
            alert(`Tag ${status}!`);
        } catch (error) {
            alert('Action failed');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        navigate('/login')
        navigate(0) // refresh
    }

    const displayName = user ? (user.firstname || user.username || user.email) : ''

    return (
        <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto' }}>
            <div className="card" style={{ marginBottom: '20px' }}>
                <h2>Welcome{displayName ? `, ${displayName}` : ''}!</h2>
                <p className="muted">You are now logged in.</p>
                <div style={{ marginTop: 20 }}>
                    <button className="btn" onClick={handleLogout}>Logout</button>
                </div>
            </div>

            {/* Tag Requests Section */}
            {tagRequests.length > 0 && (
                <div className="card">
                    <h3>Pending Tag Requests</h3>
                    <p className="muted">You have been tagged in the following posts:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {tagRequests.map(post => (
                            <div key={post._id} style={{ border: '1px solid #eee', padding: '10px', borderRadius: '8px', background: '#f9fafb' }}>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                    <img src={post.userId.profilePicture || "https://via.placeholder.com/30"} alt="pic" style={{ width: '30px', height: '30px', borderRadius: '50%', marginRight: '10px' }} />
                                    <strong>{post.userId.username}</strong>
                                    <span style={{ marginLeft: '5px', color: '#666' }}>tagged you</span>
                                </div>
                                <p style={{ marginBottom: '10px' }}>{post.description}</p>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button
                                        onClick={() => handleTagAction(post._id, 'approved')}
                                        className="btn-primary"
                                        style={{ padding: '6px 12px', fontSize: '13px' }}>
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleTagAction(post._id, 'rejected')}
                                        className="btn"
                                        style={{ padding: '6px 12px', fontSize: '13px', background: '#fee2e2', color: '#b91c1c' }}>
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
