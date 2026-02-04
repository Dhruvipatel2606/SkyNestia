import React, { useState, useEffect, useRef } from 'react';
import API from '../api';
import Webcam from 'react-webcam';
import { useNavigate } from 'react-router-dom';
import { FaCamera, FaImage, FaTimes, FaMusic, FaArrowLeft, FaCheck, FaUserTag, FaSmile } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';
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
    const [musicSearchQuery, setMusicSearchQuery] = useState('');
    const [musicResults, setMusicResults] = useState([]);
    const [isSearchingMusic, setIsSearchingMusic] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const searchMusic = async (query) => {
        if (!query) return;
        setIsSearchingMusic(true);
        try {
            // Using iTunes Search API (no key required, supports Bollywood/Hollywood via terms)
            const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=10`);
            const data = await response.json();
            const formattedResults = data.results.map(item => ({
                id: item.trackId,
                title: item.trackName,
                artist: item.artistName,
                url: item.previewUrl, // 30s preview clip
                cover: item.artworkUrl100
            }));
            setMusicResults(formattedResults);
        } catch (err) {
            console.error("Music search failed", err);
        } finally {
            setIsSearchingMusic(false);
        }
    };

    // Quick filter for categories
    const handleMusicCategory = (type) => {
        const query = type === 'Bollywood' ? 'Bollywood Trending' : type === 'Hollywood' ? 'Hollywood Hits' : 'Trending Hits';
        setMusicSearchQuery(query);
        searchMusic(query);
    };

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
        setGenerating(true);
        try {
            let payload = {};

            if (files.length > 0) {
                // Multimodal: Image + Text (if any)
                const toBase64 = file => new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                });

                const base64Image = await toBase64(files[0]);
                const imagePart = base64Image.split(',')[1];
                const mimeType = files[0].type;

                const prompt = caption.trim()
                    ? `Improve this social media caption based on the image: "${caption}". Make it highly engaging and use many relevant emojis.`
                    : "Write a high-quality, aesthetic social media caption for this image. Use plenty of expressive emojis.";

                payload = { image: imagePart, mimeType, prompt };
            } else {
                // Text-only: Improve or suggest based on current input
                payload = {
                    prompt: caption.trim()
                        ? `Complete or improve this social media post: "${caption}". Make it fun and use emojis.`
                        : "Suggest a trending, creative social media post about life, technology, or travel. Include many emojis."
                };
            }

            const { data } = await API.post('/post/generate-caption', payload);
            setCaption(data.caption);
        } catch (err) {
            console.error(err);
            alert("AI suggestion failed. Please try again.");
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

    const [showVulnerabilityModal, setShowVulnerabilityModal] = useState(false);
    const [violationType, setViolationType] = useState('');

    const onEmojiClick = (emojiObject) => {
        setCaption(prev => prev + emojiObject.emoji);
    };

    const handleSubmit = async () => {
        if (files.length === 0 && !musicFile && !musicUrl && !caption.trim()) return;
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
            if (err.response?.status === 403 && err.response?.data?.isVulnerable) {
                setViolationType(err.response.data.violationDetails?.category || "Unsafe Content");
                setShowVulnerabilityModal(true);
            } else {
                setError(err.response?.data?.message || "Failed to create post");
            }
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
                            disabled={loading || (files.length === 0 && !musicFile && !musicUrl && !caption.trim())}
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

                        <div
                            onClick={() => setStep(3)}
                            style={{ padding: '30px', border: '1px solid #ddd', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5', borderRadius: '50%', fontSize: '18px', fontWeight: 'bold', color: '#050505' }}>T</div>
                            <div>
                                <h3 style={{ margin: 0 }}>Write Post</h3>
                                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Share what's on your mind</p>
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
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <textarea
                                        placeholder="Write something interesting..."
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        style={{ flex: 1, border: 'none', resize: 'none', fontSize: '16px', fontFamily: 'inherit', outline: 'none' }}
                                        rows={4}
                                    />
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                                        >
                                            <FaSmile size={24} />
                                        </button>
                                        {showEmojiPicker && (
                                            <div style={{ position: 'absolute', bottom: '100%', right: 0, zIndex: 10 }}>
                                                <EmojiPicker onEmojiClick={onEmojiClick} />
                                            </div>
                                        )}
                                    </div>
                                </div>
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
                                <div style={{ marginTop: '10px', background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <strong style={{ fontSize: '16px' }}>Music Library</strong>
                                        <button onClick={() => setShowMusicLibrary(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}><FaTimes /></button>
                                    </div>

                                    {/* Search Bar */}
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                                        <input
                                            type="text"
                                            placeholder="Search Bollywood, Hollywood..."
                                            value={musicSearchQuery}
                                            onChange={(e) => setMusicSearchQuery(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && searchMusic(musicSearchQuery)}
                                            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                                        />
                                        <button
                                            onClick={() => searchMusic(musicSearchQuery)}
                                            style={{ background: '#0095f6', color: 'white', border: 'none', borderRadius: '8px', padding: '0 15px', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            Go
                                        </button>
                                    </div>

                                    {/* Categories */}
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '15px', overflowX: 'auto', paddingBottom: '5px' }}>
                                        {['Bollywood', 'Hollywood', 'Trending'].map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => handleMusicCategory(cat)}
                                                style={{ whiteSpace: 'nowrap', padding: '6px 12px', background: '#f0f2f5', border: 'none', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>

                                    <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {isSearchingMusic ? (
                                            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>Searching online...</div>
                                        ) : musicResults.length > 0 ? (
                                            musicResults.map((track) => (
                                                <div
                                                    key={track.id}
                                                    onClick={() => handleSelectLibraryMusic(track)}
                                                    style={{ padding: '10px', background: '#f8f9fa', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#edf2f7'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                                >
                                                    <img src={track.cover} alt="art" style={{ width: '40px', height: '40px', borderRadius: '4px' }} />
                                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                                                        <div style={{ fontSize: '12px', color: '#666' }}>{track.artist}</div>
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#0095f6', fontWeight: 'bold' }}>Select</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '14px' }}>Search for your favorite songs</div>
                                        )}
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
                {/* Vulnerability Alert Modal */}
                {showVulnerabilityModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 1000, padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            style={{
                                background: 'white', padding: '30px', borderRadius: '16px',
                                maxWidth: '400px', width: '100%', textAlign: 'center'
                            }}
                        >
                            <div style={{ fontSize: '50px', marginBottom: '20px' }}>⚠️</div>
                            <h2 style={{ color: '#e1306c', marginBottom: '10px' }}>Post Rejected</h2>
                            <p style={{ color: '#666', marginBottom: '20px', lineHeight: '1.5' }}>
                                This post contains content that violates our community safety standards.
                                <br />
                                <strong>Category: {violationType}</strong>
                            </p>
                            <p style={{ fontSize: '14px', color: '#999', marginBottom: '25px' }}>
                                You are not able to upload this post. Please ensure your content follows our guidelines.
                            </p>
                            <button
                                onClick={() => navigate('/home')}
                                className="btn-primary"
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '10px',
                                    background: '#0095f6', border: 'none', color: 'white',
                                    fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                Go to Feed
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </div>
        </AnimatePresence>
    );
};

export default CreatePost;
