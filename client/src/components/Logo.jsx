import React from 'react';

const Logo = ({ size = 60, className = '', variant = 'icon', showText = false, layout = 'horizontal' }) => {
    return (
        <div className={`skynestia-logo-wrapper ${className}`} 
            style={{ 
                display: 'inline-flex', 
                flexDirection: layout === 'vertical' ? 'column' : 'row',
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '12px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative'
            }}
        >
            <div 
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: size * 1.3,
                    height: size * 1.3,
                    background: '#ffffff',
                    borderRadius: '20px',
                    boxShadow: '0 8px 25px rgba(30, 64, 175, 0.1), inset 0 0 0 1px rgba(0,0,0,0.05)',
                    animation: 'logoPulse 4s ease-in-out infinite',
                    overflow: 'hidden'
                }}
            >
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '82%', height: '82%' }}>
                    <img 
                        src={new URL('./image.png', import.meta.url).href} 
                        alt="SkyNestia Icon" 
                        style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain',
                            mixBlendMode: 'multiply'
                        }} 
                    />
                </div>
            </div>

            {showText && (
                <span style={{ 
                    fontFamily: "'Great Vibes', cursive", 
                    fontSize: size * 0.7, 
                    color: '#ffffff', 
                    letterSpacing: '1px',
                    whiteSpace: 'nowrap',
                    textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}>
                    SkyNestia
                </span>
            )}
            
            <style>{`
                @keyframes logoPulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 10px 30px rgba(30, 64, 175, 0.12); }
                    50% { transform: scale(1.03); box-shadow: 0 15px 40px rgba(30, 64, 175, 0.18); }
                }
            `}</style>
        </div>
    );
};

export default Logo;
