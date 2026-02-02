import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API from "../api";
import Post from "./Post/Post";
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
  // const [showTagRequests, setShowTagRequests] = useState(false); // Removed modal state
  const [selectedPost, setSelectedPost] = useState(null);

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
        // Fetch User Profile
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
        const postsRes = await API.get(`/post/user/${profileId}?page=1&limit=9`); // 9 for 3x3 grid
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

  // Updated to handle FormData for image upload
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

      // Use the correct update endpoint
      const res = await API.put(`/user/update/${profileId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const updatedUser = res.data.user || res.data;
      setUserProfile(updatedUser);
      setIsEditing(false);

      // Update local storage if it's the current user
      if (isOwnProfile) {
        localStorage.setItem('user', JSON.stringify({ ...currentUser, ...updatedUser }));
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
      await API.put(`/user/${profileId}/${action}`, { currentUserId });

      setUserProfile(prev => ({
        ...prev,
        followers: action === 'follow'
          ? [...prev.followers, currentUserId]
          : prev.followers.filter(u => (u._id || u) !== currentUserId)
      }));
    } catch (err) {
      console.error("Follow error", err);
    }
  };

  // Tag action logic moved to TagRequests.jsx
  // const handleTagAction...

  const getProfileImg = (img) => {
    if (!img) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
    if (img.startsWith("http")) return img;
    // If it comes from server as "images/file.png" or just "file.png"
    const filename = img.split('/').pop();
    return `http://localhost:5000/images/${filename}`;
  };

  const getPostImg = (post) => {
    // Post images might be stored as "/images/filename.png" or just "filename.png"
    const img = post.image || (post.images && post.images[0]);
    if (!img) return null;
    if (img.startsWith("http")) return img;
    const filename = img.split('/').pop();
    return `http://localhost:5000/images/${filename}`;
  };

  if (!profileId) return <div className="card">Please log in to view your profile.</div>;
  // Removed loading check here to allow skeleton or partial render, but "Loading..." is fine for now just centered.
  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px', color: '#2563eb', width: '100%' }}>Loading Profile...</div>;
  if (!userProfile) return <div className="card error">User not found</div>;

  return (
    <div className="profile-container">
      {/* Cover Image Section */}
      <div className="profile-cover">
        <div className="back-arrow" onClick={() => navigate(-1)}>
          &#8592;
        </div>
      </div>

      {/* Profile Card Overlay */}
      <div className="profile-card">
        <div className="profile-avatar-wrapper">
          <img
            className="profile-avatar"
            src={getProfileImg(userProfile.profilePicture)}
            alt="Profile"
            onError={(e) => { e.target.onerror = null; e.target.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; }}
          />
        </div>

        <div className="profile-name">
          {userProfile.firstname} {userProfile.lastname}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '5px' }}>@{userProfile.username}</div>
        <div className="profile-profession">
          {userProfile.bio || "No bio yet"}
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div className="stat-box">
            <span className="stat-number">{userProfile.postsCount || posts.length}</span>
            <span className="stat-label">Posts</span>
          </div>
          <Link to={`/followers/${userProfile._id}`} className="stat-box">
            <span className="stat-number">{userProfile.followers?.length || 0}</span>
            <span className="stat-label">Followers</span>
          </Link>
          <Link to={`/followers/${userProfile._id}`} className="stat-box">
            <span className="stat-number">{userProfile.following?.length || 0}</span>
            <span className="stat-label">Following</span>
          </Link>
        </div>

        {/* Actions */}
        <div className="profile-actions">
          {isOwnProfile ? (
            <>
              <button className="btn-blue-soft" onClick={() => setIsEditing(!isEditing)}>
                Edit Profile
              </button>
              <button className="btn-blue-soft" onClick={() => navigate('/tag-requests')}>
                Tag Requests {pendingTags.length > 0 && <span style={{ background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>{pendingTags.length}</span>}
              </button>
            </>
          ) : (
            <>
              <button
                className={`btn-blue-primary ${userProfile.followers?.some((u) => (u._id || u) === currentUserId)
                  ? "following"
                  : ""
                  }`}
                onClick={handleFollow}
                style={{
                  backgroundColor:
                    userProfile.followers?.some(
                      (u) => (u._id || u) === currentUserId
                    )
                      ? "#fee2e2" // Light red for unfollow
                      : "",
                  color: userProfile.followers?.some(
                    (u) => (u._id || u) === currentUserId
                  ) ? "#ef4444" : "white", // Red text for unfollow
                  border: userProfile.followers?.some(
                    (u) => (u._id || u) === currentUserId
                  ) ? "1px solid #ef4444" : "none"
                }}
              >
                {userProfile.followers?.some(
                  (u) => (u._id || u) === currentUserId
                )
                  ? "Unfollow"
                  : userProfile.following?.some(
                    (u) => (u._id || u) === currentUserId
                  )
                    ? "Follow Back"
                    : "Follow"}
              </button>
              <button className="btn-blue-soft">Message</button>
            </>
          )}
        </div>
      </div>

      {/* Edit Mode Overlay */}
      {
        isEditing && (
          <div className="edit-modal">
            <form onSubmit={handleUpdateProfile}>
              <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>Edit Profile</h3>

              <div className="form-group" style={{ textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', margin: '0 auto 10px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #ddd' }}>
                  <img
                    src={previewImage || getProfileImg(userProfile.profilePicture)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt="Preview"
                  />
                </div>
                <label className="btn-blue-soft" style={{ display: 'inline-block', fontSize: '0.8rem', padding: '5px 10px', width: 'auto' }}>
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
                <button type="button" className="btn-blue-soft" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="btn-blue-primary">Save</button>
              </div>
            </form>
          </div>
        )
      }

      {/* Photos Section */}
      <div className="section-container">
        <div className="section-header">
          <span className="section-title">Photos</span>
        </div>

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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: '0.8rem', padding: '5px', textAlign: 'center' }}>
                    {post.caption?.substring(0, 30)}...
                  </div>
                )}
              </div>
            )
          })}
          {posts.length === 0 && (
            <div className="empty-state">
              No photos yet 📷
            </div>
          )}
        </div>

        {hasMorePosts && posts.length > 0 && (
          <div className="load-more-container">
            <button className="btn-load-more" onClick={loadMorePosts} disabled={loadingPosts}>
              {loadingPosts ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>


      {/* Tag Requests Modal Removed - Moved to dedicated page */}

      {/* Full Post Modal */}
      {
        selectedPost && (
          <div className="edit-modal" style={{ zIndex: 1000 }}>
            <div style={{ width: '100%', maxWidth: '600px', maxHeight: '95vh', overflowY: 'auto', background: 'transparent' }}>
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setSelectedPost(null)}
                  style={{
                    position: 'absolute', top: '10px', right: '10px', zIndex: 10,
                    background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none',
                    borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer'
                  }}
                >
                  &times;
                </button>
                <Post post={selectedPost} />
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default Profile;
