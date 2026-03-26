import React, { useEffect, useState } from 'react';
import { FiSun, FiMoon } from 'react-icons/fi';

const ThemeToggle = () => {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        setIsDark(savedTheme === 'dark');
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = isDark ? 'light' : 'dark';
        setIsDark(!isDark);
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };

    return (
        <button 
            onClick={toggleTheme}
            className="theme-toggle-btn"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderRadius: '12px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '0.95rem',
                fontWeight: '500'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--primary-light)';
                e.currentTarget.style.color = 'var(--secondary)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
            }}
        >
            {isDark ? <FiSun /> : <FiMoon />}
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
    );
};

export default ThemeToggle;
