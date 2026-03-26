import React from 'react';

const PostSkeleton = () => {
    return (
        <div className="post-card skeleton-container" style={{ marginBottom: '2rem', padding: '1.5rem', background: 'var(--card-bg)', borderRadius: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%', marginRight: '1rem' }}></div>
                <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ width: '120px', height: '16px', borderRadius: '4px', marginBottom: '8px' }}></div>
                    <div className="skeleton" style={{ width: '80px', height: '12px', borderRadius: '4px' }}></div>
                </div>
            </div>
            
            <div className="skeleton" style={{ width: '100%', height: '100px', borderRadius: '12px', marginBottom: '1rem' }}></div>
            
            <div className="skeleton" style={{ width: '100%', height: '300px', borderRadius: '12px', marginBottom: '1rem' }}></div>
            
            <div style={{ display: 'flex', gap: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <div className="skeleton" style={{ width: '60px', height: '20px', borderRadius: '4px' }}></div>
                <div className="skeleton" style={{ width: '60px', height: '20px', borderRadius: '4px' }}></div>
                <div className="skeleton" style={{ width: '60px', height: '20px', borderRadius: '4px' }}></div>
            </div>
        </div>
    );
};

export default PostSkeleton;
