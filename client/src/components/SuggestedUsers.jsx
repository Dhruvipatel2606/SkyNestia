import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSuggestedUsers, followUser, unfollowUser } from "../api/UserRequests";

const SuggestedUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const currentUser = JSON.parse(localStorage.getItem("user"));

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const { data } = await getSuggestedUsers();
                setUsers(data);
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleFollow = async (id) => {
        try {
            await followUser(id, { currentUserId: currentUser._id });
            setUsers((prev) => prev.filter((user) => user._id !== id)); // Remove from suggestions
        } catch (error) {
            console.log(error);
        }
    };

    if (loading) return null;
    if (users.length === 0) return null;

    return (
        <div className="card" style={{ marginBottom: "20px" }}>
            <h3>Suggested for you</h3>
            <div className="suggested-users-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                {users.map((user) => (
                    <div key={user._id} className="suggested-user" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                                src={user.profilePicture ? `http://localhost:5000/images/${user.profilePicture}` : "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                                alt={user.username}
                                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <Link to={`/profile/${user._id}`} style={{ fontWeight: 'bold', color: 'var(--text-main)', textDecoration: 'none' }}>
                                    {user.username}
                                </Link>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.firstname} {user.lastname}</span>
                            </div>
                        </div>
                        <button className="btn primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => handleFollow(user._id)}>
                            Follow
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SuggestedUsers;
