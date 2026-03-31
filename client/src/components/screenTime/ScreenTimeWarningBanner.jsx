import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useScreenTime from '../../hooks/useScreenTime';
import './ScreenTime.css';

/**
 * ScreenTimeWarningBanner — Animated top banner that appears at soft/hard warning levels
 */
export default function ScreenTimeWarningBanner() {
    const { warningLevel, usageSeconds, limitMinutes, isEnabled, overrideToday } = useScreenTime();
    const [dismissed, setDismissed] = useState(false);
    const lastWarningRef = useRef(null);

    // Reset dismissed state when warning level escalates
    if (warningLevel !== lastWarningRef.current) {
        if (warningLevel === 'hard' && lastWarningRef.current === 'soft') {
            setDismissed(false); // Re-show when escalating
        }
        lastWarningRef.current = warningLevel;
    }

    // Don't show if: not enabled, no warning, blocked (lock screen handles that), dismissed, or overridden
    if (!isEnabled || !warningLevel || warningLevel === 'blocked' || dismissed || overrideToday) {
        return null;
    }

    const percentage = limitMinutes > 0 ? Math.round((usageSeconds / (limitMinutes * 60)) * 100) : 0;

    const formatRemaining = () => {
        const totalLimitSeconds = limitMinutes * 60;
        const remaining = Math.max(0, totalLimitSeconds - usageSeconds);
        const mins = Math.floor(remaining / 60);
        if (mins < 1) return 'less than a minute';
        if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''}`;
        const hrs = Math.floor(mins / 60);
        const rmins = mins % 60;
        return `${hrs}h ${rmins}m`;
    };

    return (
        <AnimatePresence>
            <motion.div
                className={`screentime-warning-banner ${warningLevel}`}
                initial={{ y: -80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -80, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
                <span className="screentime-warning-icon">
                    {warningLevel === 'soft' ? '⏰' : '🔴'}
                </span>
                <span className="screentime-warning-text">
                    {warningLevel === 'soft'
                        ? `You've used ${percentage}% of your daily limit. ${formatRemaining()} remaining.`
                        : `Almost at your daily limit! Only ${formatRemaining()} left.`
                    }
                </span>
                <button
                    className="screentime-warning-dismiss"
                    onClick={() => setDismissed(true)}
                >
                    Dismiss
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
