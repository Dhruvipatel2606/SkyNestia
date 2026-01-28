import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../api";

const Profile = () => {
  const { id } = useParams();
  const [userProfile, setUserProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Edit Form State
  const [editData, setEditData] = useState({
    firstname: '',
    lastname: '',
    bio: ''
  });

  const currentUserRaw = localStorage.getItem('user');
  const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
  const currentUserId = currentUser?._id;

  const profileId = id || currentUserId;
  const isOwnProfile = profileId === currentUserId;

  useEffect(() => {
    if (!profileId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const userRes = await API.get(`/user/${profileId}`);
        const userData = userRes.data.profile || userRes.data.user || userRes.data;
        setUserProfile(userData);
        setEditData({
          firstname: userData.firstname || '',
          lastname: userData.lastname || '',
          bio: userData.bio || ''
        });

        const postsRes = await API.get(`/post/user/${profileId}`);
        setPosts(postsRes.data);

      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [profileId]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const res = await API.put(`/user/${profileId}`, editData);
      setUserProfile(res.data.user);
      setIsEditing(false);
      if (isOwnProfile) {
        localStorage.setItem('user', JSON.stringify({ ...currentUser, ...res.data.user }));
      }
    } catch (err) {
      alert("Failed to update profile");
    }
  };

  const handleFollow = async () => {
    try {
      const action = userProfile.followers.includes(currentUserId) ? 'unfollow' : 'follow';
      await API.put(`/user/${profileId}/${action}`, { currentUserId });

      setUserProfile(prev => ({
        ...prev,
        followers: action === 'follow'
          ? [...prev.followers, currentUserId]
          : prev.followers.filter(id => id !== currentUserId)
      }));
    } catch (err) {
      console.error("Follow error", err);
    }
  };

  if (!profileId) return <div className="card">Please log in to view your profile.</div>;
  if (loading) return <div className="text-center" style={{ marginTop: '50px' }}>Loading Profile...</div>;
  if (!userProfile) return <div className="card error">User not found</div>;

  return (
    <div className="profile-container" style={{ maxWidth: '935px', margin: '0 auto', padding: '20px' }}>

      {/* Header Section (Instagram Style) */}
      <div className="profile-header" style={{ display: 'flex', marginBottom: '44px', alignItems: 'flex-start' }}>

        {/* Avatar Area */}
        <div style={{ flexShrink: 0, marginRight: '30px', marginLeft: '20px' }}>
          <div style={{
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '1px solid #dbdbdb'
          }}>
            <img
              src={userProfile.profilePicture || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
              alt="profile"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>

        {/* Info Area */}
        <div style={{ flexGrow: 1, marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '20px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '300', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userProfile.username}
            </h2>

            {isOwnProfile ? (
              <button className="btn" style={{ fontWeight: '600', padding: '5px 9px', fontSize: '14px', border: '1px solid #dbdbdb' }} onClick={() => setIsEditing(!isEditing)}>
                Edit Profile
              </button>
            ) : (
              <button
                className={`btn ${userProfile.followers?.includes(currentUserId) ? '' : 'primary'}`}
                style={{ padding: '5px 20px', fontSize: '14px' }}
                onClick={handleFollow}
              >
                {userProfile.followers?.includes(currentUserId) ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>

          <div style={{ display: 'flex', marginBottom: '20px', fontSize: '16px' }}>
            <div style={{ marginRight: '40px' }}><span style={{ fontWeight: '600' }}>{posts.length}</span> posts</div>
            <div style={{ marginRight: '40px' }}><span style={{ fontWeight: '600' }}>{userProfile.followers?.length || 0}</span> followers</div>
            <div style={{ marginRight: '40px' }}><span style={{ fontWeight: '600' }}>{userProfile.following?.length || 0}</span> following</div>
          </div>

          <div className="profile-bio">
            <div style={{ fontWeight: '600' }}>{userProfile.firstname} {userProfile.lastname}</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{userProfile.bio}</div>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <form onSubmit={handleUpdateProfile}>
            <h3>Edit Profile</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <input className="w-full" placeholder="First Name" value={editData.firstname} onChange={e => setEditData({ ...editData, firstname: e.target.value })} style={{ padding: '8px', border: '1px solid #dbdbdb', borderRadius: '4px' }} />
              <input className="w-full" placeholder="Last Name" value={editData.lastname} onChange={e => setEditData({ ...editData, lastname: e.target.value })} style={{ padding: '8px', border: '1px solid #dbdbdb', borderRadius: '4px' }} />
            </div>
            <textarea className="w-full" placeholder="Bio" rows={3} value={editData.bio} onChange={e => setEditData({ ...editData, bio: e.target.value })} style={{ padding: '8px', border: '1px solid #dbdbdb', borderRadius: '4px', width: '100%', marginBottom: '10px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn primary">Save</button>
              <button type="button" className="btn" onClick={() => setIsEditing(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Grid Posts Section */}
      <div style={{ borderTop: '1px solid #dbdbdb', paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', marginBottom: '20px', textTransform: 'uppercase', fontSize: '12px', fontWeight: '600', letterSpacing: '1px' }}>
          <span style={{ borderTop: '1px solid #262626', paddingTop: '10px', marginTop: '-11px', cursor: 'pointer' }}>Posts</span>
          <span style={{ color: '#8e8e8e', cursor: 'pointer' }}>Saved</span>
          <span style={{ color: '#8e8e8e', cursor: 'pointer' }}>Tagged</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '28px' }}>
          {posts.map(post => (
            <div key={post._id} style={{ position: 'relative', paddingBottom: '100%', overflow: 'hidden', cursor: 'pointer', background: '#fafafa' }}>
              {post.image || (post.images && post.images[0]) ? (
                <img
                  src={post.image || post.images[0]}
                  alt="post"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#8e8e8e', padding: '10px', textAlign: 'center' }}>
                  {post.description}
                </div>
              )}

              {/* Hover Overlay could go here */}
            </div>
          ))}
        </div>

        {posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#8e8e8e' }}>
            No posts yet.
          </div>
        )}
      </div>

    </div>
  );
};

export default Profile;
