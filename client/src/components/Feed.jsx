import { useEffect, useState, useRef, useCallback } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import Post from "./Post/Post";

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

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
          // Filter out duplicates just in case
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
    <div className="feed-container">
      <div className="feed-header">
        <h2>News Feed</h2>
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

      {loadingMore && <div className="loading-more">Loading more posts...</div>}
      {!hasMore && posts.length > 0 && <div className="loading-more">You're all caught up!</div>}
    </div>
  );
};

export default Feed;
