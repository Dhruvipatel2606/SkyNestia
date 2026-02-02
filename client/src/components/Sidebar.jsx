import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiSearch, FiCompass, FiMessageSquare, FiHeart, FiPlusSquare, FiUser, FiMenu, FiLogOut, FiSettings, FiActivity, FiBookmark, FiMoon, FiAlertCircle } from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = ({ isOpen, toggle }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = (path) => location.pathname === path;
    const [showMore, setShowMore] = useState(false);
    const menuRef = useRef(null);

    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

    const handleLogout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMore(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!currentUser) return null;

    return (
        <div className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
            <div className="sidebar-logo" onClick={toggle} style={{ cursor: 'pointer' }} title={isOpen ? "Collapse" : "Expand"}>
                {isOpen ? <Link to="#">SkyNestia</Link> : <span style={{ fontFamily: "'Great Vibes', cursive", fontSize: '1.8rem', color: 'white', background: 'linear-gradient(135deg, #fff 0%, var(--secondary-color) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SN</span>}
            </div>

            <nav className="sidebar-nav">
                <Link to="/feed" className={`sidebar-link ${isActive('/feed') ? 'active' : ''}`} title="Home">
                    <FiHome className="sidebar-icon" />
                    {isOpen && <span>Home</span>}
                </Link>

                <div className="sidebar-link" title="Search">
                    <FiSearch className="sidebar-icon" />
                    {isOpen && <span>Search</span>}
                </div>

                {/* Explore Removed */}

                <Link to="/chat" className={`sidebar-link ${isActive('/chat') ? 'active' : ''}`} title="Messages">
                    <FiMessageSquare className="sidebar-icon" />
                    {isOpen && <span>Messages</span>}
                </Link>

                <div className="sidebar-link" title="Notifications">
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
                                src={currentUser.profilePicture.startsWith('http') ? currentUser.profilePicture : `http://localhost:5000/images/${currentUser.profilePicture.split('/').pop()}`}
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
                        <div className="more-item"><FiSettings className="more-icon" /> <span>Settings</span></div>
                        <div className="more-item"><FiActivity className="more-icon" /> <span>Your activity</span></div>
                        <Link to="/saved" className="more-item" style={{ textDecoration: 'none', color: 'inherit' }}><FiBookmark className="more-icon" /> <span>Saved</span></Link>
                        <div className="more-item"><FiMoon className="more-icon" /> <span>Switch appearance</span></div>
                        <div className="more-item"><FiAlertCircle className="more-icon" /> <span>Report a problem</span></div>
                        <div className="more-divider"></div>
                        <div className="more-item" onClick={handleLogout}><span>Log out</span></div>
                    </div>
                )}

                <div className={`sidebar-link ${showMore ? 'active' : ''}`} onClick={() => setShowMore(!showMore)} style={{ cursor: 'pointer' }} title="More">
                    <FiMenu className="sidebar-icon" />
                    {isOpen && <span>More</span>}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
