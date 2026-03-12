import React, { useEffect, useState } from 'react';
import API from '../api';
import './YourActivity.css';
import { FiClock, FiLogIn, FiCalendar } from 'react-icons/fi';

const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
};

const YourActivity = () => {
    const [activity, setActivity] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const response = await API.get('/user/activity');
                setActivity(response.data);
            } catch (error) {
                console.error('Failed to fetch activity', error);
            } finally {
                setLoading(false);
            }
        };
        fetchActivity();
    }, []);

    if (loading) return (
        <div className="activity-page">
            <div className="activity-header">
                <h2>Your activity</h2>
            </div>
            <div className="loading-spinner" style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>
        </div>
    );

    if (!activity) return (
        <div className="activity-page">
            <div className="activity-header">
                <h2>Your activity</h2>
            </div>
            <div style={{ textAlign: 'center', marginTop: '50px' }}>Error loading activity</div>
        </div>
    );

    const today = new Date().toISOString().split('T')[0];
    const todaysUsage = activity.appUsage?.find(u => u.date === today)?.timeSpent || 0;

    // Convert to readable format
    const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins < 60) return `${mins}m ${secs}s`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return `${hours}h ${remainingMins}m`;
    };

    const last7Days = getLast7Days();
    const chartData = last7Days.map(date => {
        const record = activity.appUsage?.find(u => u.date === date);
        const seconds = record ? record.timeSpent : 0;
        return {
            date,
            dayName: new Date(date).toLocaleDateString(undefined, { weekday: 'short' }),
            seconds
        };
    });

    const maxSeconds = Math.max(...chartData.map(d => d.seconds), 60); // At least 60s max to avoid divide by zero or tiny bars

    return (
        <div className="activity-page">
            <div className="activity-header">
                <h2>Your activity</h2>
            </div>

            <div className="activity-grid">
                <div className="activity-card">
                    <div className="activity-icon-container">
                        <FiClock className="activity-icon" />
                    </div>
                    <div className="activity-info">
                        <h3>Time spent</h3>
                        <p className="activity-desc">Time spent on SkyNestia today</p>
                    </div>
                    <h2 className="activity-value">{formatTime(todaysUsage)}</h2>
                </div>

                <div className="activity-card">
                    <div className="activity-icon-container">
                        <FiLogIn className="activity-icon" />
                    </div>
                    <div className="activity-info">
                        <h3>Logins</h3>
                        <p className="activity-desc">Total times you have logged in</p>
                    </div>
                    <h2 className="activity-value">{activity.loginCount}</h2>
                </div>

                <div className="activity-card">
                    <div className="activity-icon-container">
                        <FiCalendar className="activity-icon" />
                    </div>
                    <div className="activity-info">
                        <h3>Account history</h3>
                        <p className="activity-desc">When you joined SkyNestia</p>
                    </div>
                    <h2 className="activity-value" style={{ fontSize: '22px' }}>
                        {activity.createdAt
                            ? new Date(activity.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                            : 'Unknown Date'}
                    </h2>
                </div>
            </div>

            <div className="chart-section">
                <div className="chart-header">
                    <h3>Time Spent (Last 7 Days)</h3>
                </div>
                <div className="chart-container">
                    {chartData.map((data, index) => {
                        const heightPercent = Math.max((data.seconds / maxSeconds) * 100, 2); // Minimum 2% height for visibility
                        return (
                            <div key={index} className="chart-bar-wrapper">
                                <div
                                    className="chart-bar"
                                    style={{ height: `${heightPercent}%` }}
                                    data-time={formatTime(data.seconds)}
                                ></div>
                                <span className="chart-label">{data.dayName}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default YourActivity;
