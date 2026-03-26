import React, { useRef, useState, useEffect } from 'react';
import API from '../api';
import './StoryEditor.css';
import { FiX, FiCheck, FiMusic, FiSmile, FiEdit2 } from 'react-icons/fi';

const StoryEditor = ({ file, onCancel, onSuccess }) => {
    const canvasRef = useRef(null);
    const [previewUrl, setPreviewUrl] = useState(URL.createObjectURL(file));
    const [isDrawing, setIsDrawing] = useState(false);
    const [stickers, setStickers] = useState([]);
    const [music, setMusic] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [color, setColor] = useState('#ffffff');
    const [activeTool, setActiveTool] = useState(null); // 'draw', 'sticker', 'music'

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = previewUrl;
        img.onload = () => {
            // Set canvas size to match image or container
            canvas.width = img.width;
            canvas.height = img.height;
            // Draw original image once as background? 
            // Better to keep image as <img> and canvas as transparent overlay
        };
    }, [previewUrl]);

    const startDrawing = (e) => {
        if (activeTool !== 'draw') return;
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;

        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const addSticker = (emoji) => {
        setStickers([...stickers, { type: 'emoji', content: emoji, x: 45, y: 45, rotation: 0, scale: 2 }]);
        setActiveTool(null);
    };

    const handleUpload = async () => {
        setUploading(true);
        const canvas = canvasRef.current;
        const drawingData = canvas.toDataURL('image/png'); // Transparent drawing layer

        const formData = new FormData();
        formData.append('media', file);
        formData.append('mediaType', file.type.startsWith('video') ? 'video' : 'image');
        formData.append('stickers', JSON.stringify(stickers));
        formData.append('music', JSON.stringify(music));
        formData.append('drawing', drawingData);

        try {
            await API.post('/story', formData);
            onSuccess();
        } catch (err) {
            alert("Failed to post story");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="story-editor-overlay">
            <div className="story-editor-container">
                <div className="editor-media-preview">
                    {file.type.startsWith('video') ? (
                        <video src={previewUrl} autoPlay muted loop />
                    ) : (
                        <img src={previewUrl} alt="editor" />
                    )}
                    <canvas 
                        ref={canvasRef} 
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className={activeTool === 'draw' ? 'drawing-active' : ''}
                    />

                    {stickers.map((s, i) => (
                        <div key={i} className="editor-sticker" style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: `${20 * s.scale}px` }}>
                            {s.content}
                        </div>
                    ))}
                </div>

                <div className="editor-toolbar">
                    <button onClick={onCancel} className="tool-btn"><FiX /></button>
                    
                    <button className={`tool-btn ${activeTool === 'draw' ? 'active' : ''}`} onClick={() => setActiveTool('draw')}><FiEdit2 /></button>
                    <button className={`tool-btn ${activeTool === 'sticker' ? 'active' : ''}`} onClick={() => setActiveTool('sticker')}><FiSmile /></button>
                    <button className={`tool-btn ${activeTool === 'music' ? 'active' : ''}`} onClick={() => {
                        const m = prompt("Enter Song Name:", "Ocean Eyes - Billie Eilish");
                        if (m) setMusic({ title: m.split('-')[0], artist: m.split('-')[1] || "Unknown" });
                    }}><FiMusic /></button>

                    <button onClick={handleUpload} className="tool-btn primary" disabled={uploading}>
                        {uploading ? "..." : <FiCheck />}
                    </button>
                </div>

                {activeTool === 'draw' && (
                    <div className="color-palette">
                        {['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00'].map(c => (
                            <div key={c} className={`color-swatch ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
                        ))}
                    </div>
                )}

                {activeTool === 'sticker' && (
                    <div className="sticker-selector">
                        {['🔥', '❤️', '📍', '💯', '✨', '😂', '👋', '🌈'].map(emoji => (
                            <button key={emoji} onClick={() => addSticker(emoji)}>{emoji}</button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryEditor;
