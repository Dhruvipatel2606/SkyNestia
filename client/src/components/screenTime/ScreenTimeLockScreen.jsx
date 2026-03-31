import React from 'react';
import { motion } from 'framer-motion';
import useScreenTime from '../../hooks/useScreenTime';
import './ScreenTime.css';

/**
 * ScreenTimeLockScreen — Full-screen overlay shown when daily limit is reached.
 * Blurred background, usage stats, and a "Continue for today" override button.
 */
export default function ScreenTimeLockScreen() {
    const { usageSeconds, limitMinutes, handleOverride } = useScreenTime();

    const formatTime = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        const m = Math.floor(seconds / 60);
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        const rm = m % 60;
        return `${h}h ${rm}m`;
    };

    const formatLimit = (mins) => {
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const rm = mins % 60;
        return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
    };

    return (
        <motion.div
            className="screentime-lock-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <motion.div
                className="screentime-lock-card"
                initial={{ scale: 0.85, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 20 }}
            >
                <span className="screentime-lock-emoji">🌙</span>
                <h2 className="screentime-lock-title">Time to take a break</h2>
                <p className="screentime-lock-subtitle">
                    You've reached your daily screen time limit on SkyNestia.
                    Taking breaks helps you stay healthy and focused.
                </p>

                <div className="screentime-lock-stats">
                    <div className="screentime-lock-stat">
                        <span className="screentime-lock-stat-value">{formatTime(usageSeconds)}</span>
                        <span className="screentime-lock-stat-label">Time Used</span>
                    </div>
                    <div className="screentime-lock-stat">
                        <span className="screentime-lock-stat-value">{formatLimit(limitMinutes)}</span>
                        <span className="screentime-lock-stat-label">Daily Limit</span>
                    </div>
                </div>

                {/* Circular progress ring */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                    <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                        <circle
                            cx="50" cy="50" r="42"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="6"
                        />
                        <circle
                            cx="50" cy="50" r="42"
                            fill="none"
                            stroke="#f44336"
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 42}
                            strokeDashoffset={0}
                        />
                    </svg>
                </div>

                <motion.button
                    className="screentime-lock-override-btn"
                    onClick={handleOverride}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                >
                    I understand, continue for today
                </motion.button>
            </motion.div>
        </motion.div>
    );
}
