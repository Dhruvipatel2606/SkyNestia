import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiCheck, FiVideo, FiMusic, FiType } from 'react-icons/fi';
import API from '../../api';
import './Reels.css';

const CreateReel = ({ onClose, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [caption, setCaption] = useState("");
    const [musicTitle, setMusicTitle] = useState("Original Audio");
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState("");
    
    const fileInput = useRef(null);
    const videoPreview = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            setError("File too large (max 50MB)");
            return;
        }

        if (!file.type.startsWith('video/')) {
            setError("Must be a video file");
            return;
        }

        setFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setError("");
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('media', file);
        formData.append('caption', caption);
        formData.append('musicTitle', musicTitle);

        try {
            await API.post('/reels', formData, {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                }
            });
            onSuccess();
        } catch (err) {
            setError(err.response?.data?.message || "Upload failed");
            setUploading(false);
        }
    };

    return (
        <div className="create-reel-modal">
            <div className="create-reel-modal-content">
                <div className="modal-header">
                    <h3>Create Reel</h3>
                    <button onClick={onClose} disabled={uploading}><FiX size={24} /></button>
                </div>
                
                <div className="modal-body">
                    {!previewUrl ? (
                        <div className="upload-placeholder" onClick={() => fileInput.current.click()}>
                            <FiVideo size={60} />
                            <p>Select video for your Reel</p>
                            <span>Vertical videos work best (9:16)</span>
                            <button className="btn-select">Select from computer</button>
                        </div>
                    ) : (
                        <div className="reel-creation-view">
                            <div className="preview-container">
                                <video ref={videoPreview} src={previewUrl} autoPlay muted loop className="creator-video-preview" />
                                <div className="video-progress-overlay">
                                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                            
                            <div className="reel-details-form">
                                <div className="form-group">
                                    <label><FiType /> Caption</label>
                                    <textarea 
                                        rows={4} 
                                        value={caption} 
                                        onChange={e => setCaption(e.target.value)}
                                        placeholder="Write a caption..." 
                                    />
                                </div>
                                
                                <div className="form-group">
                                    <label><FiMusic /> Music</label>
                                    <input 
                                        value={musicTitle} 
                                        onChange={e => setMusicTitle(e.target.value)}
                                        placeholder="Music Name" 
                                    />
                                </div>

                                {uploading ? (
                                    <div className="uploading-state">
                                        <p>Uploading... {progress}%</p>
                                        <div className="progress-bar">
                                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <button className="btn-upload" onClick={handleUpload}>
                                        <FiCheck /> Post Reel
                                    </button>
                                )}
                                
                                {error && <p className="error-text">{error}</p>}
                                <button className="btn-discard" onClick={() => { setFile(null); setPreviewUrl(null); }} disabled={uploading}>
                                    Discard and Choose Another
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                <input 
                    type="file" 
                    ref={fileInput} 
                    onChange={handleFileChange} 
                    hidden 
                    accept="video/*" 
                />
            </div>
        </div>
    );
};

export default CreateReel;
