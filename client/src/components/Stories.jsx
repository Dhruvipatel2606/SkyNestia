import React, { useEffect, useState } from 'react';
import API from '../api';
import './Stories.css';
import { FiPlus } from 'react-icons/fi';
import StoryEditor from './StoryEditor';

const Stories = () => {
    const [stories, setStories] = useState([]);
    const [activeStoryIndex, setActiveStoryIndex] = useState(0);
    const [selectedStory, setSelectedStory] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [editorFile, setEditorFile] = useState(null);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const baseUrl = API.defaults.baseURL.replace('/api', '');

    const getProfilePic = (user) => {
        if (!user?.profilePicture) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
        if (typeof user.profilePicture === 'string' && user.profilePicture.startsWith('http')) return user.profilePicture;
        const picName = typeof user.profilePicture === 'string' ? user.profilePicture.split('/').pop() : "";
        return `${baseUrl}/images/${picName}`;
    };

    useEffect(() => {
        fetchStories();
    }, []);

    const fetchStories = async () => {
        try {
            const res = await API.get('/story');
            const grouped = res.data.reduce((acc, story) => {
                const userId = story.userId._id;
                if (!acc[userId]) {
                    acc[userId] = {
                        user: story.userId,
                        stories: []
                    };
                }
                acc[userId].stories.push(story);
                return acc;
            }, {});
            setStories(Object.values(grouped));
        } catch (err) {
            console.error("Error fetching stories", err);
        }
    };

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setEditorFile(file);
    };

    const openViewer = (group) => {
        setSelectedStory(group);
        setActiveStoryIndex(0);
        handleView(group.stories[0]._id);
    };

    const handleView = async (storyId) => {
        try {
            await API.put(`/story/${storyId}/view`);
        } catch (err) { console.error("View tracking failed", err); }
    };

    const handleReact = async (storyId, type) => {
        try {
            await API.put(`/story/${storyId}/react`, { type });
            // Refresh local state or just show feedback
        } catch (err) { console.error("Reaction failed", err); }
    };

    const nextStory = () => {
        if (activeStoryIndex < selectedStory.stories.length - 1) {
            const nextIdx = activeStoryIndex + 1;
            setActiveStoryIndex(nextIdx);
            handleView(selectedStory.stories[nextIdx]._id);
        } else {
            setSelectedStory(null);
        }
    };

    const prevStory = () => {
        if (activeStoryIndex > 0) {
            setActiveStoryIndex(activeStoryIndex - 1);
        }
    };

    const currentStory = selectedStory ? selectedStory.stories[activeStoryIndex] : null;

    return (
        <div className="stories-container">
            <div className="story-item create-story">
                <input type="file" id="story-upload" hidden onChange={handleUpload} accept="image/*,video/*" disabled={uploading} />
                <label htmlFor="story-upload" className="story-circle">
                    {uploading ? <div className="spinner-mini"></div> : <FiPlus />}
                    <img src={getProfilePic(currentUser)} alt="me" />
                </label>
                <span className="story-username">Your Story</span>
            </div>

            {stories.map((group, idx) => (
                <div key={idx} className="story-item" onClick={() => openViewer(group)}>
                    <div className="story-circle active">
                        <img src={getProfilePic(group.user)} alt="user" />
                    </div>
                    <span className="story-username">{group.user.username}</span>
                </div>
            ))}

            {/* Viewer Modal */}
            {selectedStory && currentStory && (
                <div className="story-viewer-overlay" onClick={() => setSelectedStory(null)}>
                    <div className="story-viewer-content" onClick={e => e.stopPropagation()}>
                        <div className="story-progress-bar">
                            {selectedStory.stories.map((s, i) => (
                                <div key={i} className={`progress-segment ${i === activeStoryIndex ? 'active' : i < activeStoryIndex ? 'completed' : ''}`}></div>
                            ))}
                        </div>
                        <div className="story-header-minimal">
                            <img src={getProfilePic(selectedStory.user)} alt="" className="mini-avatar" />
                            <span>{selectedStory.user.username}</span>
                            <span className="story-date-small">• {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <button className="close-btn" onClick={() => setSelectedStory(null)}>×</button>
                        </div>
                        
                        <div className="story-media-container" onClick={nextStory}>
                            <button className="nav-arrow left" onClick={(e) => { e.stopPropagation(); prevStory(); }}>‹</button>
                            <button className="nav-arrow right" onClick={(e) => { e.stopPropagation(); nextStory(); }}>›</button>
                            
                            {currentStory.mediaType === 'video' ? (
                                <video key={currentStory.media} src={`${API.defaults.baseURL.replace('/api', '')}${currentStory.media}`} autoPlay muted playsInline onEnded={nextStory} />
                            ) : (
                                <img key={currentStory.media} src={`${API.defaults.baseURL.replace('/api', '')}${currentStory.media}`} alt="" />
                            )}

                            {/* Overlays: Stickers, Music, Drawing */}
                            {currentStory.stickers?.map((sticker, sIdx) => (
                                <div key={sIdx} className="story-sticker" style={{ left: `${sticker.x}%`, top: `${sticker.y}%`, transform: `rotate(${sticker.rotation}deg) scale(${sticker.scale})` }}>
                                    {sticker.type === 'emoji' ? sticker.content : sticker.content}
                                </div>
                            ))}
                            {currentStory.music && (
                                <div className="story-music-sticker">
                                    🎵 {currentStory.music.title} - {currentStory.music.artist}
                                </div>
                            )}
                            {currentStory.drawing && (
                                <img src={currentStory.drawing} alt="" className="story-drawing-overlay" />
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="story-footer">
                            <div className="story-reply-box">
                                <input 
                                    type="text" 
                                    placeholder="Send message..." 
                                    onKeyDown={async (e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                            try {
                                                await API.post(`/story/${currentStory._id}/reply`, { text: e.target.value });
                                                e.target.value = '';
                                                alert("Reply sent!");
                                            } catch (err) { alert("Failed to send reply"); }
                                        }
                                    }}
                                />
                                <button className="story-action-icon" onClick={async () => {
                                    try {
                                        const res = await API.post(`/story/${currentStory._id}/save`);
                                        alert(res.data.saved ? "Saved to Profile" : "Removed from Saved");
                                    } catch (err) { alert("Save failed"); }
                                }}>🔖</button>
                                {currentStory.userId._id === currentUser._id && (
                                    <button className="story-action-icon" onClick={async () => {
                                        if (window.confirm("Delete this story?")) {
                                            try {
                                                await API.delete(`/story/${currentStory._id}`);
                                                fetchStories();
                                                nextStory();
                                            } catch (err) { alert("Delete failed"); }
                                        }
                                    }}>🗑️</button>
                                )}
                            </div>
                            
                            <div className="reaction-row">
                                {['❤️', '🙌', '🔥', '😂', '😮', '😢'].map(emoji => (
                                    <button key={emoji} onClick={() => handleReact(currentStory._id, emoji)}>{emoji}</button>
                                ))}
                            </div>
                            <div className="footer-meta">
                                {currentStory.userId._id === currentUser._id && (
                                    <>
                                        <div className="viewer-count-mini">
                                            👁️ {currentStory.viewers?.length || 0} viewers
                                        </div>
                                        <button className="highlight-btn-mini" onClick={async () => {
                                            const title = prompt("Enter Highlight Name:", "Highlights");
                                            if (title) {
                                                try {
                                                    await API.post('/highlight', { title, stories: [currentStory._id], coverImage: currentStory.media });
                                                    alert("Added to Highlights!");
                                                } catch (err) { alert("Failed to add highlight"); }
                                            }
                                        }}>⭐ Highlight</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Editor Modal */}
            {editorFile && (
                <StoryEditor 
                    file={editorFile} 
                    onCancel={() => setEditorFile(null)} 
                    onSuccess={() => {
                        setEditorFile(null);
                        fetchStories();
                    }} 
                />
            )}
        </div>
    );
};

export default Stories;
