import React, { useState, useEffect } from 'react';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { BASE_URL } from '../api';
import './HighlightViewer.css';

const HighlightViewer = ({ highlight, onClose }) => {
    const [activeStoryIndex, setActiveStoryIndex] = useState(0);
    const stories = highlight.stories || [];
    const currentStory = stories[activeStoryIndex];

    const nextStory = () => {
        if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex(activeStoryIndex + 1);
        } else {
            onClose();
        }
    };

    const prevStory = () => {
        if (activeStoryIndex > 0) {
            setActiveStoryIndex(activeStoryIndex - 1);
        }
    };

    useEffect(() => {
        const timer = setTimeout(nextStory, 5000); // Auto progress after 5s
        return () => clearTimeout(timer);
    }, [activeStoryIndex]);

    if (!currentStory) return null;

    const getMediaUrl = (media) => {
        if (media.startsWith('http')) return media;
        return `${BASE_URL}${media}`;
    };

    return (
        <div className="hv-overlay" onClick={onClose}>
            <div className="hv-content" onClick={e => e.stopPropagation()}>
                <div className="hv-progress">
                    {stories.map((s, i) => (
                        <div key={i} className={`hv-bar ${i === activeStoryIndex ? 'active' : i < activeStoryIndex ? 'completed' : ''}`}></div>
                    ))}
                </div>
                
                <div className="hv-header">
                    <img src={getMediaUrl(highlight.coverImage || highlight.userId.profilePicture)} alt="" className="hv-avatar" />
                    <span>{highlight.title}</span>
                    <button className="hv-close" onClick={onClose}><FiX /></button>
                </div>

                <div className="hv-media-container">
                    {activeStoryIndex > 0 && <button className="hv-nav left" onClick={prevStory}><FiChevronLeft /></button>}
                    {activeStoryIndex < stories.length - 1 && <button className="hv-nav right" onClick={nextStory}><FiChevronRight /></button>}
                    
                    {currentStory.mediaType === 'video' ? (
                        <video 
                            src={getMediaUrl(currentStory.media)} 
                            autoPlay 
                            muted 
                            playsInline 
                            onEnded={nextStory}
                        />
                    ) : (
                        <img src={getMediaUrl(currentStory.media)} alt="" />
                    )}
                </div>
            </div>
        </div>
    );
};

export default HighlightViewer;
