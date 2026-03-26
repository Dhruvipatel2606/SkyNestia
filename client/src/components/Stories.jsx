import React, { useEffect, useState } from 'react';
import API from '../api';
import './Stories.css';
import { FiPlus, FiMoreVertical, FiTrash2, FiDownload, FiBookmark, FiSend, FiX, FiEye, FiStar } from 'react-icons/fi';
import StoryEditor from './StoryEditor';
import { BASE_URL } from '../api';

const Stories = () => {
    const [stories, setStories] = useState([]);
    const [activeStoryIndex, setActiveStoryIndex] = useState(0);
    const [selectedStory, setSelectedStory] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [editorFile, setEditorFile] = useState(null);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const currentUserId = currentUser._id || currentUser.id;
    const baseUrl = API.defaults.baseURL.replace('/api', '');

    const isOwner = (storyUserId) => {
        if (!storyUserId || !currentUserId) return false;
        const uid = typeof storyUserId === 'object' ? storyUserId._id : storyUserId;
        return uid === currentUserId;
    };

    const getProfilePic = (user) => {
        if (!user?.profilePicture) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
        if (typeof user.profilePicture === 'string' && user.profilePicture.startsWith('http')) return user.profilePicture;
        const picName = typeof user.profilePicture === 'string' ? user.profilePicture.split('/').pop() : "";
        return `${BASE_URL}/images/${picName}`;
    };

    useEffect(() => {
        fetchStories();
    }, []);

    useEffect(() => {
        if (!selectedStory) return;
        const timer = setTimeout(nextStory, 5000);
        return () => clearTimeout(timer);
    }, [selectedStory, activeStoryIndex]);

    const fetchStories = async () => {
        try {
            const res = await API.get('/story');
            const grouped = res.data.reduce((acc, story) => {
                if (!story.userId) return acc;
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

    const handleDownload = async (url, filename) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename || "sky_nestia_story";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (err) { console.error("Download failed", err); }
    };

    const handleDelete = async (storyId) => {
        if (window.confirm("Delete this story?")) {
            try {
                await API.delete(`/story/${storyId}`);
                fetchStories();
                nextStory();
                setShowMoreMenu(false);
            } catch (err) { alert("Delete failed"); }
        }
    };

    const currentStory = selectedStory ? selectedStory.stories[activeStoryIndex] : null;

    return (
        <>
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
            </div>

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
                            
                            <div className="story-header-actions">
                                <div className="more-menu-container">
                                    <button className="icon-btn-action" onClick={(e) => { e.stopPropagation(); setShowMoreMenu(!showMoreMenu); }}>
                                        <FiMoreVertical size={20} />
                                    </button>
                                    
                                    {showMoreMenu && (
                                        <div className="story-more-dropdown" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => handleDownload(`${BASE_URL}${currentStory.media}`, `story_${currentStory._id}`)}>
                                                <FiDownload /> Download
                                            </button>
                                            {isOwner(currentStory.userId) && (
                                                <button className="btn-danger" onClick={() => handleDelete(currentStory._id)}>
                                                    <FiTrash2 /> Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button className="close-btn" onClick={() => { setSelectedStory(null); setShowMoreMenu(false); }}>
                                    <FiX />
                                </button>
                            </div>
                        </div>
                        
                        <div className="story-media-container" onClick={nextStory}>
                            <button className="nav-arrow left" onClick={(e) => { e.stopPropagation(); prevStory(); }}>‹</button>
                            <button className="nav-arrow right" onClick={(e) => { e.stopPropagation(); nextStory(); }}>›</button>
                            
                            {currentStory.mediaType === 'video' ? (
                                <video key={currentStory.media} src={`${BASE_URL}${currentStory.media}`} autoPlay muted playsInline onEnded={nextStory} />
                            ) : (
                                <img key={currentStory.media} src={`${BASE_URL}${currentStory.media}`} alt="" />
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
                                <button className="story-send-btn">
                                    <FiSend />
                                </button>
                                <button className="story-action-icon" onClick={async () => {
                                    try {
                                        const res = await API.post(`/story/${currentStory._id}/save`);
                                        alert(res.data.saved ? "Saved to Profile" : "Removed from Saved");
                                    } catch (err) { alert("Save failed"); }
                                }}>
                                    <FiBookmark />
                                </button>
                            </div>
                            
                            <div className="reaction-row">
                                {['❤️', '🙌', '🔥', '😂', '😮', '😢'].map(emoji => (
                                    <button key={emoji} onClick={() => handleReact(currentStory._id, emoji)}>{emoji}</button>
                                ))}
                            </div>
                             <div className="footer-meta">
                                {isOwner(currentStory.userId) && (
                                    <>
                                        <div className="viewer-count-mini">
                                            <FiEye size={16} /> {currentStory.viewers?.length || 0}
                                        </div>
                                        <button className="highlight-btn-mini" onClick={async () => {
                                            const title = prompt("Enter Highlight Name:", "Highlights");
                                            if (title) {
                                                try {
                                                    await API.post('/highlight', { title, stories: [currentStory._id], coverImage: currentStory.media });
                                                    alert("Added to Highlights!");
                                                } catch (err) { alert("Failed to add highlight"); }
                                            }
                                        }}>
                                            <FiStar size={16} /> Highlight
                                        </button>
                                        <button className="delete-btn-mini" onClick={() => handleDelete(currentStory._id)}>
                                            <FiTrash2 size={16} /> Delete
                                        </button>
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
        </>
    );
};

export default Stories;
