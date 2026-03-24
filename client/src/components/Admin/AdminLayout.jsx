import React, { useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FiGrid, FiUsers, FiCheckCircle, FiArrowLeft, FiShield, FiFileText, FiFlag, FiBarChart2 } from 'react-icons/fi';
import './AdminLayout.css';

export default function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();

    const currentUser = useMemo(() => {
        const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    }, []);

    if (!currentUser) {
        navigate('/login', { replace: true });
        return null;
    }

    if (!currentUser.isAdmin) {
        navigate('/feed', { replace: true });
        return null;
    }

    const getProfileImg = (img) => {
        if (!img) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
        if (img.startsWith("http")) return img;
        return `http://localhost:5000/images/${img.split('/').pop()}`;
    };

    const pageTitle = () => {
        const path = location.pathname;
        if (path.includes('/admin/users')) return 'User Management';
        if (path.includes('/admin/posts')) return 'Post Management';
        if (path.includes('/admin/reports')) return 'Reported Content';
        if (path.includes('/admin/verifications')) return 'Verifications';
        if (path.includes('/admin/analytics')) return 'System Analytics';
        return 'Overview';
    };

    const navItems = [
        { to: '/admin', end: true, icon: <FiGrid className="nav-icon" />, label: 'Overview', id: 'admin-nav-overview' },
        { to: '/admin/users', icon: <FiUsers className="nav-icon" />, label: 'Users', id: 'admin-nav-users' },
        { to: '/admin/posts', icon: <FiFileText className="nav-icon" />, label: 'Posts', id: 'admin-nav-posts' },
        { to: '/admin/reports', icon: <FiFlag className="nav-icon" />, label: 'Reports', id: 'admin-nav-reports' },
        { to: '/admin/verifications', icon: <FiCheckCircle className="nav-icon" />, label: 'Verifications', id: 'admin-nav-verifications' },
        { to: '/admin/analytics', icon: <FiBarChart2 className="nav-icon" />, label: 'Analytics', id: 'admin-nav-analytics' },
    ];

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-brand">
                    <h1><FiShield style={{ marginRight: 8, verticalAlign: 'middle', fontSize: '1.1rem' }} />SkyNestia</h1>
                    <span>Admin Console</span>
                </div>

                <nav className="admin-sidebar-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.id}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
                            id={item.id}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="admin-sidebar-footer">
                    <NavLink to="/feed" className="admin-back-link" id="admin-back-to-app">
                        <FiArrowLeft className="nav-icon" />
                        <span>Back to App</span>
                    </NavLink>
                </div>
            </aside>

            <div className="admin-main">
                <header className="admin-topbar">
                    <div className="admin-topbar-title">{pageTitle()}</div>
                    <div className="admin-topbar-user">
                        <span className="admin-topbar-name">{currentUser.firstname || currentUser.username}</span>
                        <img
                            src={getProfileImg(currentUser.profilePicture)}
                            alt="Admin"
                            className="admin-topbar-avatar"
                            onError={(e) => { e.target.onerror = null; e.target.src = "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"; }}
                        />
                    </div>
                </header>

                <div className="admin-content">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
