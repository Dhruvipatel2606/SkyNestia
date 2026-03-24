import React, { useState, useEffect } from 'react';
import API from '../../api';
import { FiFileText, FiUsers, FiFlag, FiAlertTriangle, FiHeart, FiMessageCircle } from 'react-icons/fi';

export default function AdminAnalytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const { data } = await API.get('/admin/analytics');
            setData(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="admin-loading"><div className="admin-spinner"></div> Loading analytics...</div>;
    if (error) return <div className="admin-toast error">⚠️ {error}</div>;
    if (!data) return null;

    const stats = [
        { label: 'Total Posts', value: data.totalPosts, icon: <FiFileText />, color: 'blue' },
        { label: 'Total Users', value: data.totalUsers, icon: <FiUsers />, color: 'green' },
        { label: 'Total Likes', value: data.totalLikes, icon: <FiHeart />, color: 'rose' },
        { label: 'Total Comments', value: data.totalComments, icon: <FiMessageCircle />, color: 'purple' },
        { label: 'Total Reports', value: data.totalReports, icon: <FiFlag />, color: 'amber' },
        { label: 'Pending Reports', value: data.pendingReports, icon: <FiAlertTriangle />, color: 'rose' },
        { label: 'Flagged Posts', value: data.flaggedPosts, icon: <FiAlertTriangle />, color: 'cyan' },
    ];

    // Find max value for chart scaling
    const maxUserGrowth = Math.max(...(data.userGrowth?.map(d => d.count) || [1]), 1);
    const maxPostGrowth = Math.max(...(data.postGrowth?.map(d => d.count) || [1]), 1);

    const formatDay = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    };

    return (
        <>
            {/* Stat Cards */}
            <div className="admin-stats-grid">
                {stats.map((s, i) => (
                    <div key={i} className={`admin-stat-card ${s.color}`}>
                        <div className="admin-stat-icon">{s.icon}</div>
                        <div className="admin-stat-label">{s.label}</div>
                        <div className="admin-stat-value">{s.value.toLocaleString()}</div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                {/* User Growth Chart */}
                <div className="admin-section-card">
                    <div className="admin-section-header"><h3>User Growth (30 days)</h3></div>
                    <div className="admin-section-body">
                        {data.userGrowth?.length > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160, padding: '0 4px' }}>
                                {data.userGrowth.map((d, i) => (
                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{d.count}</span>
                                        <div
                                            style={{
                                                width: '100%',
                                                height: `${(d.count / maxUserGrowth) * 120}px`,
                                                minHeight: 4,
                                                background: 'linear-gradient(180deg, #60a5fa, #3b82f6)',
                                                borderRadius: '4px 4px 0 0',
                                                transition: 'height 0.3s ease'
                                            }}
                                            title={`${formatDay(d._id)}: ${d.count} new users`}
                                        />
                                        <span style={{ fontSize: '0.55rem', color: '#475569', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                                            {formatDay(d._id)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#475569', textAlign: 'center' }}>No data for this period</p>
                        )}
                    </div>
                </div>

                {/* Post Growth Chart */}
                <div className="admin-section-card">
                    <div className="admin-section-header"><h3>Posts Created (30 days)</h3></div>
                    <div className="admin-section-body">
                        {data.postGrowth?.length > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 160, padding: '0 4px' }}>
                                {data.postGrowth.map((d, i) => (
                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{d.count}</span>
                                        <div
                                            style={{
                                                width: '100%',
                                                height: `${(d.count / maxPostGrowth) * 120}px`,
                                                minHeight: 4,
                                                background: 'linear-gradient(180deg, #a78bfa, #8b5cf6)',
                                                borderRadius: '4px 4px 0 0',
                                                transition: 'height 0.3s ease'
                                            }}
                                            title={`${formatDay(d._id)}: ${d.count} posts`}
                                        />
                                        <span style={{ fontSize: '0.55rem', color: '#475569', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                                            {formatDay(d._id)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#475569', textAlign: 'center' }}>No data for this period</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Reports by Reason */}
            <div className="admin-section-card">
                <div className="admin-section-header"><h3>Reports by Reason</h3></div>
                <div className="admin-section-body">
                    {data.reportsByReason?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {data.reportsByReason.map((r, i) => {
                                const maxCount = data.reportsByReason[0]?.count || 1;
                                const percentage = (r.count / maxCount) * 100;
                                const reasonColors = {
                                    spam: '#f59e0b', harassment: '#ef4444', inappropriate: '#f97316',
                                    hate_speech: '#dc2626', violence: '#e11d48', misinformation: '#8b5cf6', other: '#6b7280'
                                };
                                return (
                                    <div key={i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.88rem' }}>
                                            <span style={{ color: '#cbd5e1', textTransform: 'capitalize' }}>{r._id?.replace('_', ' ') || 'Unknown'}</span>
                                            <span style={{ color: '#94a3b8', fontWeight: 600 }}>{r.count}</span>
                                        </div>
                                        <div style={{ height: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${percentage}%`,
                                                background: reasonColors[r._id] || '#6b7280',
                                                borderRadius: 4,
                                                transition: 'width 0.5s ease'
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ color: '#475569', textAlign: 'center' }}>No reports yet</p>
                    )}
                </div>
            </div>
        </>
    );
}
