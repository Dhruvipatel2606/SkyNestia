import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { createChat } from "../api/ChatRequests";
import API from "../api.js";
import Post from "./Post/Post";
import { FiGrid, FiUser } from "react-icons/fi";
import "./Profile.css";

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Pagination State
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [postsPage, setPostsPage] = useState(1);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Edit Form State
  const [editData, setEditData] = useState({
    firstname: '',
    lastname: '',
    bio: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Tagging & Post View State
  const [pendingTags, setPendingTags] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);

  // User List Modal State
  const [activeModal, setActiveModal] = useState(null); // 'followers' or 'following'
  const [modalUsers, setModalUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const currentUserRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
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

        // Fetch User Posts (Page 1)
        setPostsPage(1);
        const postsRes = await API.get(`/post/user/${profileId}?page=1&limit=9`);
        setPosts(postsRes.data.posts || []);
        setHasMorePosts(postsRes.data.hasMore);

      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    if (isOwnProfile) {
      API.get('/post/tags/pending')
        .then(res => setPendingTags(res.data))
        .catch(err => console.error("Failed to fetch pending tags", err));
    }
  }, [profileId, isOwnProfile]);

  const loadMorePosts = async () => {
    if (loadingPosts || !hasMorePosts) return;
    setLoadingPosts(true);
    try {
      const nextPage = postsPage + 1;
      const res = await API.get(`/post/user/${profileId}?page=${nextPage}&limit=9`);
      setPosts(prev => [...prev, ...res.data.posts]);
      setHasMorePosts(res.data.hasMore);
      setPostsPage(nextPage);
    } catch (error) {
      console.error("Error loading more posts", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      let img = e.target.files[0];
      setImageFile(img);
      setPreviewImage(URL.createObjectURL(img));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("firstname", editData.firstname);
      formData.append("lastname", editData.lastname);
      formData.append("bio", editData.bio);
      if (imageFile) {
        formData.append("profileImage", imageFile);
      }

      const res = await API.put(`/user/update/${profileId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const updatedUser = res.data.user || res.data;
      setUserProfile(updatedUser);
      setIsEditing(false);

      if (isOwnProfile) {
        const newUserData = { ...currentUser, ...updatedUser };
        localStorage.setItem('user', JSON.stringify(newUserData));
        sessionStorage.setItem('user', JSON.stringify(newUserData));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update profile");
    }
  };

  const handleFollow = async () => {
    try {
      const isFollowing = userProfile.followers.some(u => (u._id || u) === currentUserId);
      const action = isFollowing ? 'unfollow' : 'follow';
      await API.put(`/user/${profileId}/${action}`);

      setUserProfile(prev => {
        if (action === 'follow') {
          // Optimistically add to followRequests
          return {
            ...prev,
            followRequests: [...(prev.followRequests || []), { _id: currentUserId }]
          };
        } else {
          // Unfollow logic
          return {
            ...prev,
            followers: prev.followers.filter(u => (u._id || u) !== currentUserId),
            followRequests: (prev.followRequests || []).filter(u => (u._id || u) !== currentUserId)
          };
        }
      });
    } catch (err) {
      console.error("Follow error", err);
    }
  };

  const getProfileImg = (img) => {
    if (!img) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
    if (img.startsWith("http")) return img;
    return `${API.defaults.baseURL.replace('/api', '')}/images/${img.split('/').pop()}`;
  };

  const getPostImg = (post) => {
    const img = post.image || (post.images && post.images[0]);
    if (!img) return null;
    if (img.startsWith("http")) return img;
    return `${API.defaults.baseURL.replace('/api', '')}${img}`;
  };

  const handleMessage = async () => {
    try {
      await createChat(currentUserId, userProfile._id);
      navigate('/chat');
    } catch (err) {
      console.error("Chat creation failed", err);
    }
  };

  const openModal = (type) => {
    console.log("Opening modal:", type, userProfile);
    setActiveModal(type);
    setSearchTerm('');
    if (type === 'followers') {
      setModalUsers(userProfile.followers || []);
    } else {
      setModalUsers(userProfile.following || []);
    }
  };

  if (!profileId) return <div className="card">Please log in to view your profile.</div>;
  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px', color: '#2563eb', width: '100%' }}>Loading Profile...</div>;
  if (!userProfile) return <div className="card error">User not found</div>;

  return (
    <div className="profile-container">


      <div className="profile-header">
        {/* Left: Avatar */}
        <div className="profile-avatar-section">
          <div className="avatar-container">
            <img
              className="profile-avatar"
              src={getProfileImg(userProfile.profilePicture)}
              alt="Profile"
              onError={(e) => { e.target.onerror = null; e.target.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; }}
            />
          </div>
        </div>

        {/* Right: Info */}
        <div className="profile-info-section">
          <div className="info-top-row">
            <h2 className="username-text">{userProfile.username}</h2>
            {isOwnProfile && <div className="settings-icon" onClick={() => navigate('/settings')} title="Settings">⚙️</div>}
          </div>

          <div className="fullname-row" style={{ fontWeight: '600', marginBottom: '4px' }}>
            {userProfile.firstname} {userProfile.lastname}
          </div>

          <div className="bio-row" style={{ marginBottom: '16px' }}>
            <div className="bio-text">{userProfile.bio || "No bio yet."}</div>
          </div>

          <div className="info-stats-row">
            <div className="stat-item"><strong>{userProfile.postsCount || posts.length}</strong> posts</div>
            <div className="stat-item" onClick={() => openModal('followers')}><strong>{userProfile.followers?.length || 0}</strong> followers</div>
            <div className="stat-item" onClick={() => openModal('following')}><strong>{userProfile.following?.length || 0}</strong> following</div>
          </div>
        </div>
      </div>

      <div className="profile-actions-row">
        {isOwnProfile ? (
          <>
            <button className="action-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
            <button className="action-btn" onClick={() => navigate('/archive')}>View archive</button>
          </>
        ) : (
          <>
            <button
              className={`action-btn primary ${userProfile.followers?.some((u) => (u._id || u) === currentUserId) ? "following" : ""}`}
              onClick={handleFollow}
            >
              {userProfile.followers?.some((u) => (u._id || u) === currentUserId)
                ? "Unfollow"
                : userProfile.followRequests?.some((u) => (u._id || u) === currentUserId)
                  ? "Requested"
                  : userProfile.following?.some((u) => (u._id || u) === currentUserId)
                    ? "Follow Back"
                    : "Follow"}
            </button>
            <button className="action-btn" onClick={handleMessage}>Message</button>
          </>
        )}
      </div>



      {/* Highlights Section */}
      <div className="highlights-section">
        {
          userProfile.highlights && userProfile.highlights.map((highlight, index) => (
            <div className="highlight-item" key={index}>
              <div className="highlight-circle">
                <img src={highlight.cover} alt={highlight.title} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <span className="highlight-label">{highlight.title}</span>
            </div>
          ))
        }

        {
          isOwnProfile && (
            <div className="highlight-item">
              <div className="highlight-circle add-new">+</div>
              <span className="highlight-label">New</span>
            </div>
          )
        }
      </div>

      {/* Navigation Tabs */}
      <div className="profile-tabs">
        <div className="tab-item active" title="Posts">
          <span className="tab-icon"><FiGrid size={24} /></span>
        </div>
        <div className="tab-item" title="Tagged">
          <span className="tab-icon"><FiUser size={24} /></span>
        </div>
      </div>

      {/* Photos Grid */}
      <div className="photos-grid">
        {posts.map(post => {
          const imgUrl = getPostImg(post);
          return (
            <div key={post._id} className="photo-item" onClick={() => navigate(`/post/${post._id}`)}>
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt="post"
                  className="photo-img"
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=Error"; }}
                />
              ) : (
                <div className="text-post-fallback">
                  {post.caption?.substring(0, 30)}...
                </div>
              )}
            </div>
          )
        })}
        {posts.length === 0 && (
          <div className="empty-state">
            <div className="camera-icon">📷</div>
            <h3>Share photos</h3>
            <p>When you share photos, they will appear on your profile.</p>
            {isOwnProfile && <button className="action-btn text-blue" onClick={() => navigate('../create-post')}>Share your first photo</button>}
          </div>
        )}
      </div>

      {
        hasMorePosts && posts.length > 0 && (
          <div className="load-more-container">
            <button className="btn-load-more" onClick={loadMorePosts} disabled={loadingPosts}>
              {loadingPosts ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )
      }



      {/* User List Modal (Followers/Following) */}
      {activeModal && (
        <div className="edit-overlay" onClick={() => setActiveModal(null)} style={{ zIndex: 1100 }}>
          <div className="user-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>{activeModal === 'followers' ? 'Followers' : 'Following'}</span>
              <div className="close-modal" onClick={() => setActiveModal(null)}>&times;</div>
            </div>
            <div className="modal-search-bar">
              <input
                type="text"
                className="modal-search-input"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="user-list-content">
              {modalUsers.filter(u =>
                (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (u.firstname && u.firstname.toLowerCase().includes(searchTerm.toLowerCase()))
              ).length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {activeModal === 'followers' ? 'No followers found.' : 'No following found.'}
                </div>
              ) : (
                modalUsers.filter(u =>
                  (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (u.firstname && u.firstname.toLowerCase().includes(searchTerm.toLowerCase()))
                ).map(user => (
                  <div key={user._id} className="user-list-item" onClick={() => { navigate(`/profile/${user._id}`); setActiveModal(null); }}>
                    <img
                      src={getProfileImg(user.profilePicture)}
                      alt={user.username}
                      className="user-list-avatar"
                      onError={(e) => { e.target.onerror = null; e.target.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; }}
                    />
                    <div className="user-list-info">
                      <div className="user-list-username">{user.username}</div>
                      <div className="user-list-fullname">{user.firstname} {user.lastname}</div>
                    </div>
                    <button className="list-action-btn">
                      {activeModal === 'following' ? 'Following' : 'Remove'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode Overlay - Kept Functional */}
      {
        isEditing && (
          <div className="edit-overlay">
            <div className="edit-modal">
              <form onSubmit={handleUpdateProfile}>
                <h3 style={{ marginBottom: '15px' }}>Edit Profile</h3>

                <div className="form-group" style={{ textAlign: 'center' }}>
                  <div className="edit-avatar-preview">
                    <img
                      src={previewImage || getProfileImg(userProfile.profilePicture)}
                      alt="Preview"
                    />
                  </div>
                  <label className="change-photo-btn">
                    Change Photo
                    <input type="file" onChange={handleImageChange} style={{ display: 'none' }} />
                  </label>
                </div>

                <div className="form-group">
                  <label>First Name</label>
                  <input className="form-input" value={editData.firstname} onChange={e => setEditData({ ...editData, firstname: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input className="form-input" value={editData.lastname} onChange={e => setEditData({ ...editData, lastname: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Bio</label>
                  <textarea className="form-input" rows={3} value={editData.bio} onChange={e => setEditData({ ...editData, bio: e.target.value })} />
                </div>
                <div className="form-actions">
                  <button type="button" className="action-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="action-btn primary">Save</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Full Post Modal */}
      {
        selectedPost && (
          <div className="edit-overlay" style={{ zIndex: 1000 }}>
            <div className="modal-content-wrapper">
              <button className="close-modal-btn" onClick={() => setSelectedPost(null)}>&times;</button>
              <Post post={selectedPost} />
            </div>
          </div>
        )
      }
    </div>
  );
};

export default Profile;


