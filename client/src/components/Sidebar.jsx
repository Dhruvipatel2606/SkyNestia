import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiSearch, FiCompass, FiMessageSquare, FiHeart, FiPlusSquare, FiUser, FiMenu, FiLogOut, FiSettings, FiActivity, FiBookmark, FiMoon, FiAlertCircle, FiChevronLeft } from 'react-icons/fi';
import './Sidebar.css';
import Notifications from './Notifications';
import { BASE_URL } from '../api';

const Sidebar = ({ isOpen, toggle }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = (path) => location.pathname === path;
    const [showMore, setShowMore] = useState(false);
    const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Initialize dark mode from local storage or system preference
    const [darkMode, setDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        return savedTheme === 'dark';
    });

    const menuRef = useRef(null);

    const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');

    useEffect(() => {
        const theme = darkMode ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [darkMode]);

    const handleLogout = () => {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        localStorage.removeItem('user'); // Cleanup old localstorage if exists
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMore(false);
                // Reset submenu when closing main menu? Optional, but often good UX.
                // setShowAppearanceMenu(false); 
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // When showMore is toggled off, we might want to reset the submenu
    useEffect(() => {
        if (!showMore) {
            setTimeout(() => setShowAppearanceMenu(false), 200); // Simple delay
        }
    }, [showMore]);


    if (!currentUser) return null;

    return (
        <div className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
            {/* Same Logo & Nav as before */}
            <div className="sidebar-logo" onClick={toggle} style={{ cursor: 'pointer' }} title={isOpen ? "Collapse" : "Expand"}>
                {isOpen ? <Link to="#">SkyNestia</Link> : <span style={{ fontFamily: "'Great Vibes', cursive", fontSize: '1.8rem', color: 'white', background: 'linear-gradient(135deg, #fff 0%, var(--secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SN</span>}
            </div>

            <nav className="sidebar-nav">
                <Link to="/feed" className={`sidebar-link ${isActive('/feed') ? 'active' : ''}`} title="Home">
                    <FiHome className="sidebar-icon" />
                    {isOpen && <span>Home</span>}
                </Link>

                <Link to="/search" className={`sidebar-link ${isActive('/search') ? 'active' : ''}`} title="Search">
                    <FiSearch className="sidebar-icon" />
                    {isOpen && <span>Search</span>}
                </Link>

                <Link to="/chat" className={`sidebar-link ${isActive('/chat') ? 'active' : ''}`} title="Messages">
                    <FiMessageSquare className="sidebar-icon" />
                    {isOpen && <span>Messages</span>}
                </Link>

                <Link to="/explore" className={`sidebar-link ${isActive('/explore') ? 'active' : ''}`} title="Explore">
                    <FiCompass className="sidebar-icon" />
                    {isOpen && <span>Explore</span>}
                </Link>

                <Link to="/reels" className={`sidebar-link ${isActive('/reels') ? 'active' : ''}`} title="Reels">
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <FiCompass className="sidebar-icon" />
                        <span style={{ position: 'absolute', top: -5, right: -5, background: '#ed4956', width: 6, height: 6, borderRadius: '50%' }}></span>
                    </div>
                    {isOpen && <span>Reels</span>}
                </Link>

                <div className="sidebar-link" title="Notifications" onClick={() => setShowNotifications(!showNotifications)} style={{ cursor: 'pointer' }}>
                    <FiHeart className="sidebar-icon" />
                    {isOpen && <span>Notifications</span>}
                </div>

                <Link to="/create-post" className={`sidebar-link ${isActive('/create-post') ? 'active' : ''}`} title="Create">
                    <FiPlusSquare className="sidebar-icon" />
                    {isOpen && <span>Create</span>}
                </Link>

                <Link to={`/profile/${currentUser._id}`} className={`sidebar-link ${location.pathname.includes('/profile') ? 'active' : ''}`} title="Profile">
                    <div className="sidebar-profile-wrapper">
                        {currentUser.profilePicture ? (
                            <img
                                src={currentUser.profilePicture.startsWith('http') ? currentUser.profilePicture : `${BASE_URL}/images/${currentUser.profilePicture.split('/').pop()}`}
                                alt="Profile"
                                className="sidebar-avatar"
                                onError={(e) => { e.target.onerror = null; e.target.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; }}
                            />
                        ) : (
                            <FiUser className="sidebar-icon" />
                        )}
                    </div>
                    {isOpen && <span>Profile</span>}
                </Link>
            </nav>

            <div className="sidebar-footer" ref={menuRef}>
                {showMore && (
                    <div className={`more-menu ${!isOpen ? 'collapsed-menu' : ''}`}>
                        {!showAppearanceMenu ? (
                            <>
                                {currentUser?.isAdmin && (
                                    <Link to="/admin" className="more-item" style={{ textDecoration: 'none', color: 'var(--blue)', fontWeight: 'bold' }}>
                                        <FiActivity className="more-icon" /> <span>Admin Panel</span>
                                    </Link>
                                )}
                                <Link to="/settings" className="more-item" style={{ textDecoration: 'none', color: 'inherit' }}><FiSettings className="more-icon" /> <span>Settings</span></Link>
                                <Link to="/activity" className="more-item" style={{ textDecoration: 'none', color: 'inherit' }}><FiActivity className="more-icon" /> <span>Your activity</span></Link>
                                <Link to="/saved" className="more-item" style={{ textDecoration: 'none', color: 'inherit' }}><FiBookmark className="more-icon" /> <span>Saved</span></Link>
                                <div className="more-item" onClick={() => setShowAppearanceMenu(true)}><FiMoon className="more-icon" /> <span>Switch appearance</span></div>
                                <div className="more-item"><FiAlertCircle className="more-icon" /> <span>Report a problem</span></div>
                                <div className="more-divider"></div>
                                <div className="more-item" onClick={handleLogout}><span>Log out</span></div>
                            </>
                        ) : (
                            <div className="appearance-menu">
                                <div className="more-header">
                                    <button className="back-btn" onClick={() => setShowAppearanceMenu(false)}><FiChevronLeft /></button>
                                    <span className="header-title">Switch appearance</span>
                                    {darkMode ? <FiMoon className="header-icon" /> : <FiMoon className="header-icon" />}
                                </div>
                                <div className="more-divider"></div>
                                <div className="more-toggle-row">
                                    <span>Dark mode</span>
                                    <label className="switch">
                                        <input type="checkbox" checked={darkMode} onChange={() => setDarkMode(!darkMode)} />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className={`sidebar-link ${showMore ? 'active' : ''}`} onClick={() => setShowMore(!showMore)} style={{ cursor: 'pointer' }} title="More">
                    <FiMenu className="sidebar-icon" />
                    {isOpen && <span>More</span>}
                </div>
            </div>

            <Notifications isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
        </div>
    );
};

export default Sidebar;
