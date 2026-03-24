import React, { useState, useEffect } from 'react';
import API from '../../api';
import { FiUsers, FiUserCheck, FiUserX, FiCheckCircle, FiClock, FiTrendingUp, FiCalendar } from 'react-icons/fi';

export default function AdminOverview() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const { data } = await API.get('/admin/stats');
            setStats(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch stats');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-loading">
                <div className="admin-spinner"></div>
                Loading dashboard data...
            </div>
        );
    }

    if (error) {
        return (
            <div className="admin-toast error">⚠️ {error}</div>
        );
    }

    const statCards = [
        { label: 'Total Users', value: stats.totalUsers, icon: <FiUsers />, color: 'blue' },
        { label: 'Active Users', value: stats.activeUsers, icon: <FiUserCheck />, color: 'green' },
        { label: 'Suspended', value: stats.suspendedUsers, icon: <FiUserX />, color: 'rose' },
        { label: 'Verified Users', value: stats.verifiedUsers, icon: <FiCheckCircle />, color: 'purple' },
        { label: 'Pending Verification', value: stats.pendingVerifications, icon: <FiClock />, color: 'amber' },
        { label: 'New Today', value: stats.newUsersToday, icon: <FiCalendar />, color: 'cyan' },
        { label: 'New This Week', value: stats.newUsersThisWeek, icon: <FiTrendingUp />, color: 'indigo' },
    ];

    return (
        <>
            <div className="admin-stats-grid">
                {statCards.map((card, i) => (
                    <div key={i} className={`admin-stat-card ${card.color}`}>
                        <div className="admin-stat-icon">{card.icon}</div>
                        <div className="admin-stat-label">{card.label}</div>
                        <div className="admin-stat-value">{card.value}</div>
                    </div>
                ))}
            </div>

            <div className="admin-section-card">
                <div className="admin-section-header">
                    <h3>Quick Summary</h3>
                </div>
                <div className="admin-section-body">
                    <p style={{ color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
                        Your platform has <strong style={{ color: '#f1f5f9' }}>{stats.totalUsers}</strong> registered users,
                        of which <strong style={{ color: '#4ade80' }}>{stats.activeUsers}</strong> are currently active.
                        {stats.pendingVerifications > 0 && (
                            <> There {stats.pendingVerifications === 1 ? 'is' : 'are'} <strong style={{ color: '#fbbf24' }}>{stats.pendingVerifications}</strong> pending verification {stats.pendingVerifications === 1 ? 'request' : 'requests'} awaiting your review.</>
                        )}
                        {stats.newUsersToday > 0 && (
                            <> <strong style={{ color: '#22d3ee' }}>{stats.newUsersToday}</strong> new {stats.newUsersToday === 1 ? 'user joined' : 'users joined'} today.</>
                        )}
                    </p>
                </div>
            </div>
        </>
    );
}
