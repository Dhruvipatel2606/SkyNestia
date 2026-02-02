import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../api';

const Followers = () => {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState('followers');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('user')));

    useEffect(() => {
        fetchUsers();
    }, [id, activeTab]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            let res;
            if (activeTab === 'followers') {
                res = await API.get(`/user/followers/${id}`);
            } else if (activeTab === 'following') {
                // Need backend to support getting following list if not available
                // Usually userProfile keeps list of IDs, but we need details.
                // For now, assuming userProfile has populated following, but we might need a dedicated route if big.
                // SkyNestia userProfile route populates `following`.
                const profileRes = await API.get(`/user/${id}`);
                // Check if cached or db response structure
                const profile = profileRes.data.profile || profileRes.data.user || profileRes.data;
                // setUsers(profile.following || []); 
                // Wait, profile.following is populated?
                res = { data: profile.following || [] };
                // If res is not an axios response object, we handle it carefully.
            } else if (activeTab === 'mutual') {
                res = await API.get(`/user/mutual/${id}`);
            }

            // Handle the data structure variation
            const data = Array.isArray(res) ? res : (res.data || []);
            setUsers(data);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async (targetId) => {
        try {
            await API.put(`/user/${targetId}/follow`, { currentUserId: currentUser._id });
            // Update UI state locally for speed
            setUsers(users.map(u => {
                if (u._id === targetId) return { ...u, isFollowing: true }; // Simplified logic
                return u;
            }));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', minHeight: '500px' }}>
            <div className="nav-actions" style={{ justifyContent: 'space-around', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <button
                    className={`btn ${activeTab === 'followers' ? 'primary' : 'secondary'}`}
                    onClick={() => setActiveTab('followers')}
                >
                    Followers
                </button>
                <button
                    className={`btn ${activeTab === 'following' ? 'primary' : 'secondary'}`}
                    onClick={() => setActiveTab('following')}
                >
                    Following
                </button>
                <button
                    className={`btn ${activeTab === 'mutual' ? 'primary' : 'secondary'}`}
                    onClick={() => setActiveTab('mutual')}
                >
                    Mutuals
                </button>
            </div>

            <div className="user-list">
                {loading ? (
                    <div className="text-center">Loading...</div>
                ) : users.length === 0 ? (
                    <div className="text-center muted">No users found.</div>
                ) : (
                    users.map(user => (
                        <div key={user._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img
                                    src={user.profilePicture || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                    alt={user.username}
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                                <Link to={`/profile/${user._id}`} style={{ fontWeight: '600', color: 'var(--text-main)', textDecoration: 'none' }}>
                                    {user.username}
                                </Link>
                            </div>
                            {/* Simplified Follow Button - Logic depends on context */}
                            {user._id !== currentUser?._id && (
                                <button className="btn secondary" style={{ fontSize: '0.8rem', padding: '5px 10px' }}>
                                    View
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Followers;
