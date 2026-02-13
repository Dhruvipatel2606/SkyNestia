import { useEffect, useState, useRef, useCallback } from "react";
import API from "../api.js";
import { Link } from "react-router-dom";
import Post from "./Post/Post";
import SuggestedUsers from "./SuggestedUsers";

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [tagRequests, setTagRequests] = useState([]);

  useEffect(() => {
    API.get('/post/tags/pending').then(res => setTagRequests(res.data)).catch(err => console.error(err));
  }, []);

  const handleTagAction = async (postId, status) => {
    try {
      await API.put(`/post/${postId}/tag`, { status });
      setTagRequests(prev => prev.filter(p => p._id !== postId));
    } catch (error) {
      console.error('Tag action failed', error);
    }
  };

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const observer = useRef();

  const lastPostElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);

        const res = await API.get(`/feed?page=${page}&limit=5`);

        setPosts(prevPosts => {
          const newPosts = res.data.feed.filter(p => !prevPosts.some(existing => existing._id === p._id));
          return [...prevPosts, ...newPosts];
        });

        setHasMore(res.data.hasMore);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load feed');
        console.error('Feed fetch error:', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    fetchFeed();
  }, [page]);

  if (loading && page === 1) return (
    <div className="feed-container" style={{ textAlign: 'center', marginTop: '50px' }}>
      <div className="spinner"></div>
      <p>Loading your feed...</p>
    </div>
  );

  if (error && page === 1) return <div className="card error-card"><p>Error: {error}</p></div>;

  return (
    <div className="feed-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="feed-container">
        <div className="feed-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentUser && currentUser._id && (
              <Link to={`/profile/${currentUser._id}`}>
                <img
                  src={currentUser.profilePicture ? (currentUser.profilePicture.startsWith('http') ? currentUser.profilePicture : `${API.defaults.baseURL.replace('/api', '')}/images/${currentUser.profilePicture.split('/').pop()}`) : "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                  alt="Profile"
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }}
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; }}
                />
              </Link>
            )}
            <h2>News Feed</h2>
          </div>
          <Link to="/create-post" className="create-post-btn">Create Post</Link>
        </div>

        {posts.length === 0 && !loading ? (
          <div className="card empty-feed">
            <p>No posts yet. Be the first to post!</p>
            <Link to="/create-post" className="btn-primary">Create Post</Link>
          </div>
        ) : (
          <div className="posts-list">
            {posts.map((post, index) => {
              if (posts.length === index + 1) {
                return (
                  <div ref={lastPostElementRef} key={post._id}>
                    <Post post={post} />
                  </div>
                )
              } else {
                return <Post key={post._id} post={post} />
              }
            })}
          </div>
        )}

        {loadingMore && <div className="loading-more" style={{ textAlign: 'center', margin: '20px 0', color: '#666' }}>Loading more posts...</div>}
        {!hasMore && posts.length > 0 && <div className="loading-more" style={{ textAlign: 'center', margin: '20px 0', color: '#666' }}>You're all caught up!</div>}
      </div>

      <div className="feed-sidebar">
        {tagRequests.length > 0 && (
          <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '10px' }}>Tag Requests</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tagRequests.map(req => (
                <div key={req._id} style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', gap: '8px' }}>
                    <img src={req.userId.profilePicture ? (req.userId.profilePicture.startsWith('http') ? req.userId.profilePicture : `${API.defaults.baseURL.replace('/api', '')}/images/${req.userId.profilePicture.split('/').pop()}`) : "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"}
                      alt="pic" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                    <strong style={{ fontSize: '0.85rem' }}>{req.userId.username}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                    <button onClick={() => handleTagAction(req._id, 'approved')} className="btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Accept</button>
                    <button onClick={() => handleTagAction(req._id, 'rejected')} className="btn" style={{ padding: '4px 8px', fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c' }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <SuggestedUsers />
      </div>
    </div>
  );
};

export default Feed;
