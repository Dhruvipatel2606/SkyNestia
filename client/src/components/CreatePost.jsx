import React, { useState, useEffect, useRef } from 'react';
import API from '../api';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { FaCamera, FaImage, FaTimes, FaMusic, FaArrowLeft, FaCheck, FaUserTag } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
const CreatePost = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0); // 0: Select Source, 1: Capture/Upload, 2: Edit, 3: Details
    const [files, setFiles] = useState([]); // Original File objects
    const [edits, setEdits] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [editingIndex, setEditingIndex] = useState(0);

    // Camera State
    const webcamRef = useRef(null);
    const [cameraPermission, setCameraPermission] = useState(null);
    const [usingCamera, setUsingCamera] = useState(false);

    // Post Details
    const [caption, setCaption] = useState('');
    const [location, setLocation] = useState('');
    const [musicFile, setMusicFile] = useState(null);
    const [musicName, setMusicName] = useState('');
    const [visibility, setVisibility] = useState('public');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false);

    // Tagging State
    const [taggedUsers, setTaggedUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);

    const [activeTab, setActiveTab] = useState('filters');

    // Music Library State
    const [showMusicLibrary, setShowMusicLibrary] = useState(false);
    const [musicUrl, setMusicUrl] = useState(null);

    const musicLibrary = [
        { title: "Energy", url: "https://www.bensound.com/bensound-music/bensound-energy.mp3" },
        { title: "Summer", url: "https://www.bensound.com/bensound-music/bensound-summer.mp3" },
        { title: "Smile", url: "https://www.bensound.com/bensound-music/bensound-smile.mp3" },
        { title: "Dreams", url: "https://www.bensound.com/bensound-music/bensound-dreams.mp3" },
        { title: "Adventure", url: "https://www.bensound.com/bensound-music/bensound-adventure.mp3" }
    ];

    // Load last user choice for camera/gallery
    useEffect(() => {
        const lastChoice = localStorage.getItem('mediaSourceChoice');
        if (lastChoice === 'camera') {
            requestCamera();
        }
    }, []);

    const requestCamera = () => {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(() => {
                setCameraPermission(true);
                setUsingCamera(true);
                setStep(1);
                localStorage.setItem('mediaSourceChoice', 'camera');
            })
            .catch((err) => {
                setCameraPermission(false);
                alert("Camera permission denied. Please enable it in settings.");
            });
    };

    const handleGallerySelect = () => {
        document.getElementById('fileInput').click();
        localStorage.setItem('mediaSourceChoice', 'gallery');
    };

    const capturePhoto = () => {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
            fetch(imageSrc)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    handleFiles([file]);
                });
        }
    };

    const handleFileChange = (e) => {
        handleFiles(Array.from(e.target.files));
    };

    const handleFiles = (selectedFiles) => {
        if (selectedFiles.length === 0) return;

        setFiles(prev => [...prev, ...selectedFiles]);

        const newEdits = selectedFiles.map(() => ({
            filter: 'none',
            brightness: 100,
            contrast: 100,
            saturation: 100,
            rotation: 0,
            aspectRatio: 'original'
        }));

        setEdits(prev => [...prev, ...newEdits]);

        const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
        setPreviews(prev => [...prev, ...newPreviews]);

        setUsingCamera(false);
        setStep(2);
        setEditingIndex(0);
    };

    const handleMusicUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setMusicFile(file);
            setMusicName(file.name);
            setMusicUrl(null); // Clear selected library track
        }
    };

    const handleSelectLibraryMusic = (track) => {
        setMusicUrl(track.url);
        setMusicName(track.title);
        setMusicFile(null); // Clear uploaded file
        setShowMusicLibrary(false);
    };

    const updateEdit = (key, value) => {
        if (editingIndex === null) return;
        setEdits(prev => {
            const copy = [...prev];
            copy[editingIndex] = { ...copy[editingIndex], [key]: value };
            return copy;
        });
    };

    const getPreviewStyle = (index) => {
        const edit = edits[index];
        if (!edit) return {};

        let filter = `brightness(${edit.brightness}%) contrast(${edit.contrast}%) saturate(${edit.saturation}%)`;
        if (edit.filter === 'grayscale') filter += ' grayscale(100%)';
        if (edit.filter === 'sepia') filter += ' sepia(100%)';

        return {
            filter,
            transform: `rotate(${edit.rotation}deg)`,
            transition: 'all 0.3s ease'
        };
    };

    const handleGenerateCaption = async () => {
        if (files.length === 0) {
            alert("Please select an image first.");
            return;
        }

        setGenerating(true);
        try {
            // Helper to convert file to base64
            const toBase64 = file => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });

            const base64Image = await toBase64(files[0]);

            // Send the base64 image (removing the prefix)
            const imagePart = base64Image.split(',')[1];
            const mimeType = files[0].type;

            const prompt = caption.trim()
                ? `Write a better version of this caption: "${caption}". Keep it aesthetic and short.`
                : "Write a creative, aesthetic and engaging caption for this image for a social media post. Keep it short and use emojis.";

            const { data } = await API.post('/post/generate-caption', {
                image: imagePart,
                mimeType: mimeType,
                prompt: prompt
            });
            setCaption(data.caption);
        } catch (err) {
            console.error(err);
            alert("Failed to generate caption. Ensure you have a valid image.");
        } finally {
            setGenerating(false);
        }
    };

    // User Search for tagging
    const handleUserSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.length > 2) {
            setIsSearchingUsers(true);
            try {
                const res = await API.get(`/user/search?q=${query}`);
                setSearchResults(res.data);
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearchingUsers(false);
            }
        } else {
            setSearchResults([]);
        }
    };

    const addTag = (user) => {
        if (!taggedUsers.some(u => u._id === user._id)) {
            setTaggedUsers([...taggedUsers, user]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeTag = (userId) => {
        setTaggedUsers(taggedUsers.filter(u => u._id !== userId));
    };

    const handleSubmit = async () => {
        if (files.length === 0 && !musicFile) return;
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('description', caption);
        formData.append('location', location);
        formData.append('visibility', visibility);

        // Pass tags as JSON string
        const tagIds = taggedUsers.map(u => u._id);
        formData.append('tags', JSON.stringify(tagIds));

        // Append Images
        files.forEach((file) => {
            formData.append('images', file);
        });

        // Append Music
        if (musicFile) {
            formData.append('music', musicFile);
        } else if (musicUrl) {
            formData.append('musicUrl', musicUrl);
        }

        try {
            await API.post('/post', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            navigate('/home'); // Assuming home is feed
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create post");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="create-post-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', minHeight: '100vh', background: '#fff' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                    {step > 0 && <button onClick={() => setStep(step - 1)} className="icon-btn"><FaArrowLeft /></button>}
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        {step === 0 ? 'New Post' : step === 1 ? 'Capture' : step === 2 ? 'Edit' : 'Details'}
                    </h2>
                    {step === 3 ? (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || (files.length === 0 && !musicFile && !musicUrl)}
                            className="btn-primary"
                            style={{ padding: '8px 20px', borderRadius: '20px' }}
                        >
                            {loading ? 'Posting...' : 'Share'}
                        </button>
                    ) : (step === 2 && files.length > 0) ? (
                        <button onClick={() => setStep(3)} style={{ color: '#0095f6', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer' }}>Next</button>
                    ) : <div style={{ width: 24 }} />}
                </div>

                {error && <div className="error-banner" style={{ background: '#ffebe9', color: 'red', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>{error}</div>}

                {/* Step 0: Source Selection */}
                {step === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="source-selection" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '50px' }}>
                        <div
                            onClick={handleGallerySelect}
                            style={{ padding: '30px', border: '1px solid #ddd', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <FaImage size={30} color="#0095f6" />
                            <div>
                                <h3 style={{ margin: 0 }}>Choose from Gallery</h3>
                                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Upload photos from your device</p>
                            </div>
                        </div>
                        <input type="file" id="fileInput" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />

                        <div
                            onClick={() => { setStep(1); requestCamera(); }}
                            style={{ padding: '30px', border: '1px solid #ddd', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <FaCamera size={30} color="#e1306c" />
                            <div>
                                <h3 style={{ margin: 0 }}>Take Photo</h3>
                                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Use your camera to capture moments</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Step 1: Camera Capture */}
                {step === 1 && usingCamera && (
                    <div className="camera-view" style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                        {cameraPermission === false ? (
                            <div style={{ color: 'white', padding: '40px', textAlign: 'center' }}>
                                <p>Camera access denied.</p>
                                <button onClick={() => setStep(0)} className="btn-secondary">Go Back</button>
                            </div>
                        ) : (
                            <>
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={{ facingMode: "user" }}
                                    style={{ width: '100%', display: 'block' }}
                                />
                                <button
                                    onClick={capturePhoto}
                                    style={{
                                        position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                                        width: '70px', height: '70px', borderRadius: '50%', border: '4px solid white', background: 'rgba(255,255,255,0.3)', cursor: 'pointer'
                                    }}
                                />
                            </>
                        )}
                    </div>
                )}

                {/* Step 2: Editor */}
                {step === 2 && files.length > 0 && (
                    <div className="editor-view">
                        <div className="preview-container" style={{ position: 'relative', height: '400px', background: '#f0f0f0', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img
                                src={previews[editingIndex]}
                                style={{ maxHeight: '100%', maxWidth: '100%', ...getPreviewStyle(editingIndex) }}
                                alt="preview"
                            />
                        </div>

                        {/* Thumbnails */}
                        <div style={{ display: 'flex', gap: '10px', padding: '20px 0', overflowX: 'auto' }}>
                            {previews.map((src, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setEditingIndex(idx)}
                                    style={{
                                        border: editingIndex === idx ? '2px solid #0095f6' : '2px solid transparent',
                                        borderRadius: '4px', overflow: 'hidden', width: '60px', height: '60px', flexShrink: 0, cursor: 'pointer'
                                    }}
                                >
                                    <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', ...getPreviewStyle(idx) }} alt="thumb" />
                                </div>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="edit-controls">
                            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px', borderBottom: '1px solid #eee' }}>
                                <button onClick={() => setActiveTab('filters')} style={{ padding: '10px', borderBottom: activeTab === 'filters' ? '2px solid #000' : 'none', fontWeight: 'bold' }}>Filters</button>
                                <button onClick={() => setActiveTab('adjust')} style={{ padding: '10px', borderBottom: activeTab === 'adjust' ? '2px solid #000' : 'none', fontWeight: 'bold' }}>Adjust</button>
                            </div>

                            {activeTab === 'filters' && (
                                <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                                    {['none', 'grayscale', 'sepia'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => updateEdit('filter', f)}
                                            style={{ minWidth: '80px', height: '80px', background: '#eee', border: 'none', borderRadius: '4px', cursor: 'pointer', textTransform: 'capitalize' }}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'adjust' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div>
                                        <label>Brightness</label>
                                        <input type="range" min="50" max="150" value={edits[editingIndex]?.brightness || 100} onChange={(e) => updateEdit('brightness', e.target.value)} style={{ width: '100%' }} />
                                    </div>
                                    <div>
                                        <label>Contrast</label>
                                        <input type="range" min="50" max="150" value={edits[editingIndex]?.contrast || 100} onChange={(e) => updateEdit('contrast', e.target.value)} style={{ width: '100%' }} />
                                    </div>
                                    <div>
                                        <label>Rotation</label>
                                        <button onClick={() => updateEdit('rotation', (edits[editingIndex]?.rotation || 0) + 90)} style={{ display: 'block', padding: '5px 10px', marginTop: '5px' }}>Rotate 90°</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 3: Details */}
                {step === 3 && (
                    <div className="details-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                            {previews.length > 0 && <img src={previews[0]} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} alt="thumb" />}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <button
                                    onClick={handleGenerateCaption}
                                    disabled={generating}
                                    style={{
                                        alignSelf: 'flex-end',
                                        background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '5px 10px',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px'
                                    }}
                                >
                                    {generating ? '✨ Magic...' : '✨ AI Caption'}
                                </button>
                                <textarea
                                    placeholder="Write a caption..."
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    style={{ flex: 1, border: 'none', resize: 'none', fontSize: '16px', fontFamily: 'inherit', outline: 'none' }}
                                    rows={4}
                                />
                            </div>
                        </div>

                        {/* Tagging Section */}
                        <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                <FaUserTag color="#0095f6" />
                                <span style={{ fontWeight: 'bold' }}>Tag People</span>
                            </div>

                            {/* Selected Tags */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                                {taggedUsers.map(user => (
                                    <span key={user._id} style={{ background: '#e0f2fe', color: '#0095f6', padding: '4px 8px', borderRadius: '4px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        @{user.username}
                                        <FaTimes size={12} style={{ cursor: 'pointer' }} onClick={() => removeTag(user._id)} />
                                    </span>
                                ))}
                            </div>

                            <input
                                type="text"
                                placeholder="Search users to tag..."
                                value={searchQuery}
                                onChange={handleUserSearch}
                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />

                            {/* Search Results */}
                            {searchResults.length > 0 && (
                                <div style={{ marginTop: '5px', maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                                    {searchResults.map(user => (
                                        <div
                                            key={user._id}
                                            onClick={() => addTag(user)}
                                            style={{ padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #f9f9f9', background: '#fff' }}
                                        >
                                            <img src={user.profilePicture || "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} alt="av" style={{ width: '30px', height: '30px', borderRadius: '50%' }} />
                                            <span>{user.username}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', background: '#f9f9f9', borderRadius: '8px', cursor: 'pointer' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <FaMusic color="#0095f6" />
                                    <span>{musicName || "Add Music"}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div onClick={(e) => { e.preventDefault(); setShowMusicLibrary(true); }} style={{ color: '#0095f6', fontWeight: 'bold' }}>Library</div>
                                    <input type="file" accept="audio/*" onChange={handleMusicUpload} style={{ display: 'none' }} />
                                    <span style={{ color: '#0095f6', fontWeight: 'bold' }}>{musicName ? 'Change' : 'Upload'}</span>
                                </div>
                            </label>
                            {(musicFile || musicUrl) && (
                                <audio controls src={musicFile ? URL.createObjectURL(musicFile) : musicUrl} style={{ width: '100%', marginTop: '10px' }} />
                            )}

                            {showMusicLibrary && (
                                <div style={{ marginTop: '10px', background: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <strong>Select Song</strong>
                                        <button onClick={() => setShowMusicLibrary(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><FaTimes /></button>
                                    </div>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {musicLibrary.map((track, i) => (
                                            <div key={i} onClick={() => handleSelectLibraryMusic(track)} style={{ padding: '10px', background: '#f8f9fa', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>{track.title}</span>
                                                <span style={{ fontSize: '12px', color: '#666' }}>Select</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="input-group">
                            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Location</label>
                            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Add Location" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                        </div>
                    </div>
                )}
            </div>
        </AnimatePresence>
    );
};

export default CreatePost;
