import React, { useState, useEffect, useCallback, useRef } from 'react';
import API from '../../api';
import '../../components/Reels/Reels.css';
import ReelItem from '../../components/Reels/ReelItem';
import CreateReel from '../../components/Reels/CreateReel';
import { FiPlusSquare, FiMusic, FiChevronUp } from 'react-icons/fi';

const Reels = () => {
    const [reels, setReels] = useState([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    
    const containerRef = useRef(null);
    const currentUser = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user'));

    const fetchReels = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);
        try {
            const { data } = await API.get(`/reels?page=${page}`);
            if (data.length === 0) {
                setHasMore(false);
            } else {
                setReels(prev => [...prev, ...data]);
                setPage(prev => prev + 1);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [page, loading, hasMore]);

    useEffect(() => {
        fetchReels();
    }, []);

    // Scroll to bottom detection
    useEffect(() => {
        const handleScroll = () => {
            const container = containerRef.current;
            if (!container) return;
            
            const isBottom = Math.abs(container.scrollHeight - container.clientHeight - container.scrollTop) < 1;
            if (isBottom && !loading && hasMore) {
                fetchReels();
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
        }
        return () => container?.removeEventListener('scroll', handleScroll);
    }, [fetchReels, loading, hasMore]);

    return (
        <div className="reels-page">
            <div className="reels-header">
                <h2>Reels</h2>
                <button className="create-reel-btn" onClick={() => setShowCreate(true)}>
                    <FiPlusSquare /> Create Reel
                </button>
            </div>

            <div className="reels-container" ref={containerRef}>
                {reels.map((reel, idx) => (
                    <ReelItem key={reel._id + idx} reel={reel} currentUser={currentUser} />
                ))}
                
                {loading && <div className="loading-reel">Loading...</div>}
                
                {!hasMore && reels.length > 0 && (
                    <div className="no-more-reels">
                        <FiMusic size={40} style={{ marginBottom: '10px' }} />
                        <h3>You've caught up!</h3>
                        <p>No more reels to show right now.</p>
                        <button onClick={() => containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <FiChevronUp /> Back to Top
                        </button>
                    </div>
                )}

                {!loading && reels.length === 0 && (
                    <div className="no-reels-empty">
                        <FiMusic size={100} style={{ opacity: 0.1, marginBottom: '20px' }} />
                        <h3>No Reels Found</h3>
                        <p>Follow more people to see their vertical videos!</p>
                        <button className="btn-primary" onClick={() => setShowCreate(true)}>Post your first Reel</button>
                    </div>
                )}
            </div>

            {showCreate && (
                <CreateReel 
                    onClose={() => setShowCreate(false)} 
                    onSuccess={() => {
                        setPage(1);
                        setReels([]);
                        setHasMore(true);
                        setShowCreate(false);
                        // Briefly timeout to allow server to process if needed, 
                        // though it's already done before callback.
                        setTimeout(() => fetchReels(), 500); 
                    }} 
                />
            )}
        </div>
    );
};

export default Reels;
