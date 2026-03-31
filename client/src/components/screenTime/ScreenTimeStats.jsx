import React from 'react';
import useScreenTime from '../../hooks/useScreenTime';
import './ScreenTime.css';

/**
 * ScreenTimeStats — Small circular progress widget showing today's usage vs limit.
 * Can be used in Settings, Sidebar, or Activity page.
 */
export default function ScreenTimeStats() {
    const { usageSeconds, limitMinutes, isEnabled } = useScreenTime();

    if (!isEnabled || limitMinutes <= 0) return null;

    const limitSeconds = limitMinutes * 60;
    const ratio = Math.min(usageSeconds / limitSeconds, 1);
    const percentage = Math.round(ratio * 100);

    // SVG circle math
    const radius = 23;
    const circumference = 2 * Math.PI * radius;
    const dashoffset = circumference * (1 - ratio);

    // Color class
    let colorClass = 'safe';
    if (ratio >= 0.9) colorClass = 'danger';
    else if (ratio >= 0.8) colorClass = 'warning';

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        const rm = m % 60;
        return `${h}h ${rm}m`;
    };

    const remaining = Math.max(0, limitSeconds - usageSeconds);

    return (
        <div className="screentime-stats-widget">
            <div className="screentime-ring-container">
                <svg className="screentime-ring-svg" viewBox="0 0 56 56">
                    <circle className="screentime-ring-bg" cx="28" cy="28" r={radius} />
                    <circle
                        className={`screentime-ring-fill ${colorClass}`}
                        cx="28" cy="28" r={radius}
                        strokeDasharray={circumference}
                        strokeDashoffset={dashoffset}
                    />
                </svg>
                <span className="screentime-ring-percent">{percentage}%</span>
            </div>
            <div className="screentime-stats-info">
                <h4>{formatTime(usageSeconds)} used today</h4>
                <p>
                    {remaining > 0
                        ? `${formatTime(remaining)} remaining of ${formatTime(limitSeconds)}`
                        : 'Daily limit reached'}
                </p>
            </div>
        </div>
    );
}
