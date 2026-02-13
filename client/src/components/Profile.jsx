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
    bio: '',
    isPrivate: false
  });
  const [imageFile, setImageFile] = useState(null);

  const [previewImage, setPreviewImage] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [previewCover, setPreviewCover] = useState(null);

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
          bio: userData.bio || '',

          isPrivate: userData.isPrivate || false
        });
        setPreviewCover(userData.coverPicture ? getProfileImg(userData.coverPicture) : null);

        // Fetch User Posts (Page 1)
        setPostsPage(1);
        const postsRes = await API.get(`/post/user/${profileId}?page=1&limit=9`);

        // Handle Private Component Logic
        if (postsRes.data.isPrivate && postsRes.data.posts.length === 0) {
          setPosts([]);
          // We can use a state to track strictly if it's locked, but we can derive it
        } else {
          setPosts(postsRes.data.posts || []);
        }

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

  const handleCoverChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      let img = e.target.files[0];
      setCoverFile(img);
      setPreviewCover(URL.createObjectURL(img));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("firstname", editData.firstname);
      formData.append("lastname", editData.lastname);
      formData.append("bio", editData.bio);
      formData.append("isPrivate", editData.isPrivate);

      if (imageFile) {
        formData.append("profileImage", imageFile);
      }
      if (coverFile) {
        formData.append("coverImage", coverFile);
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

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      try {
        await API.delete(`/user/${currentUserId}`, {
          data: { currentUserId: currentUserId, CurrentUserAdminStatus: currentUser.isAdmin }
        });
        sessionStorage.clear();
        localStorage.clear();
        navigate('/auth');
      } catch (err) {
        console.error("Delete account error", err);
        alert("Failed to delete account");
      }
    }
  };

  const handleFollow = async () => {
    try {
      const isFollowing = userProfile.followers.some(u => (u._id || u) === currentUserId);
      const action = isFollowing ? 'unfollow' : 'follow';
      await API.put(`/user/${profileId}/${action}`);

      setUserProfile(prev => {
        if (action === 'follow') {
          if (prev.isPrivate) {
            // If private, just add to requests visually if you want, or just wait for refresh
            // API just returns message. Ideally we show "Requested"
            return { ...prev, followRequests: [...(prev.followRequests || []), { _id: currentUserId }] };
          } else {
            // Public - Direct Follow
            return {
              ...prev,
              followRequests: [...(prev.followRequests || []), { _id: currentUserId }], // Just to be safe or
              followers: [...prev.followers, { _id: currentUserId }] // Optimistic update
            };
          }
        } else {
          // Unfollow logic
          return {
            ...prev,
            followers: prev.followers.filter(u => (u._id || u) !== currentUserId),
            followRequests: (prev.followRequests || []).filter(u => (u._id || u) !== currentUserId)
          };
        }
      });

      // Re-fetch to ensure sync (simplest way to handle the branching logic)
      const userRes = await API.get(`/user/${profileId}`);
      setUserProfile(userRes.data.profile || userRes.data.user || userRes.data);

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

  // Check if profile is locked
  // If private, not owner, not follower, AND no viewable posts (meaning all posts are private/followers-only or empty)
  // If we have 'posts' (which are public ones returned from backend), we shouldn't show the full lock screen.
  // We can show a partial lock or just the posts.
  // The backend now returns public posts for strangers even if private.
  const isLocked = userProfile?.isPrivate && !isOwnProfile && !userProfile?.followers?.some(u => (u._id || u) === currentUserId) && posts.length === 0;

  if (!profileId) return <div className="card">Please log in to view your profile.</div>;
  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px', color: '#2563eb', width: '100%' }}>Loading Profile...</div>;
  if (!userProfile) return <div className="card error">User not found</div>;

  return (
    <div className="profile-container">


      <div className="profile-cover-section">
        {userProfile.coverPicture || previewCover ? (
          <img src={previewCover || getProfileImg(userProfile.coverPicture)} className="profile-cover-img" alt="cover" />
        ) : (
          <div style={{ width: '100%', height: '100%', backgroundColor: '#ccd0d5' }}></div>
        )}
        {isOwnProfile && (
          <button className="edit-cover-btn" onClick={() => setIsEditing(true)}>
            📷 Edit Cover
          </button>
        )}
      </div>

      <div className="profile-header">
        {/* Left: Avatar */}
        <div className="profile-avatar-section">
          <div className="avatar-container" onClick={() => isOwnProfile && setIsEditing(true)}>
            <img
              className="profile-avatar"
              src={getProfileImg(userProfile.profilePicture)}
              alt="Profile"
              onError={(e) => { e.target.onerror = null; e.target.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; }}
            />
            {isOwnProfile && (
              <div className="avatar-overlay">
                📷
              </div>
            )}
          </div>
        </div>

        {/* Right: Info */}
        <div className="profile-info-section">
          <div className="info-top-row">
            <h2 className="username-text">
              {userProfile.username}
              {userProfile.isVerified && <span className="verified-badge" title="Verified">✔️</span>}
            </h2>
            {isOwnProfile && <div className="settings-icon" onClick={() => navigate('/settings')} title="Settings">⚙️</div>}
          </div>

          <div className="fullname-row" style={{ fontWeight: '600', marginBottom: '4px' }}>
            {userProfile.firstname} {userProfile.lastname}
          </div>

          <div className="bio-row" style={{ marginBottom: '16px' }}>
            <div className="bio-text">{userProfile.bio || "No bio yet."}</div>
          </div>
          <div className="info-stats-row">
            <div className="stat-item"><strong>{userProfile.postsCount || (isLocked ? 0 : posts.length)}</strong> posts</div>
            <div className="stat-item" onClick={() => !isLocked && openModal('followers')} style={{ cursor: isLocked ? 'default' : 'pointer' }}><strong>{userProfile.followers?.length || 0}</strong> followers</div>
            <div className="stat-item" onClick={() => !isLocked && openModal('following')} style={{ cursor: isLocked ? 'default' : 'pointer' }}><strong>{userProfile.following?.length || 0}</strong> following</div>
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


        </div>
      </div>





      {/* Highlights Section */}
      <div className="highlights-section">
        {
          !isLocked ? (
            userProfile.highlights && userProfile.highlights.map((highlight, index) => (
              <div className="highlight-item" key={index}>
                <div className="highlight-circle">
                  <img src={highlight.cover} alt={highlight.title} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                </div>
                <span className="highlight-label">{highlight.title}</span>
              </div>
            ))
          ) : null
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

      {/* Photos Grid or Privacy Message */}
      {isLocked ? (
        <div className="privacy-locked-container" style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔒</div>
          <h3>This Account is Private</h3>
          <p>Follow to see their private photos and videos.</p>
        </div>
      ) : (
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
              <h3>{isOwnProfile ? "Share photos" : "No posts yet"}</h3>
              {isOwnProfile && <button className="action-btn text-blue" onClick={() => navigate('../create-post')}>Share your first photo</button>}
            </div>
          )}
        </div>
      )}

      {
        !isLocked && hasMorePosts && posts.length > 0 && (
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

                <div className="form-group" style={{ textAlign: 'center' }}>
                  <label>Cover Photo</label>
                  <div className="edit-avatar-preview" style={{ borderRadius: '8px', width: '100%', height: '100px' }}>
                    {previewCover ? <img src={previewCover} alt="Cover Preview" /> : <div style={{ width: '100%', height: '100%', backgroundColor: '#ddd' }}></div>}
                  </div>
                  <label className="change-photo-btn">
                    Change Cover
                    <input type="file" onChange={handleCoverChange} style={{ display: 'none' }} />
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
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label>Private Account</label>
                  <input
                    type="checkbox"
                    checked={editData.isPrivate}
                    onChange={e => setEditData({ ...editData, isPrivate: e.target.checked })}
                    style={{ width: '20px', height: '20px' }}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="action-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="action-btn primary">Save</button>
                </div>

                <div className="danger-zone">
                  <button type="button" className="danger-btn" onClick={handleDeleteAccount}>Delete Account</button>
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


