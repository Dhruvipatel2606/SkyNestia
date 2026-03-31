import React, { useState, useEffect } from 'react';
import useScreenTime from '../../hooks/useScreenTime';
import { updateScreenTimeSettings } from '../../api/screentimeAPI';
import ScreenTimeStats from './ScreenTimeStats';
import './ScreenTime.css';

/**
 * ScreenTimeSettings — Settings panel for screen time management.
 * Screen time is completely OPTIONAL.
 * - Disabled by default → user has unlimited usage
 * - User can enable it and set a custom daily limit
 */
export default function ScreenTimeSettings() {
    const { isEnabled, limitMinutes, usageSeconds, refreshSettings } = useScreenTime();

    const [enabled, setEnabled] = useState(isEnabled);
    const [hours, setHours] = useState(Math.floor(limitMinutes / 60));
    const [minutes, setMinutes] = useState(limitMinutes % 60);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Sync from context when it loads
    useEffect(() => {
        setEnabled(isEnabled);
        setHours(Math.floor(limitMinutes / 60));
        setMinutes(limitMinutes % 60);
    }, [isEnabled, limitMinutes]);

    const handleSave = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setMessage('');
        setError('');

        const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);

        if (enabled && totalMinutes <= 0) {
            setError('Please set a daily limit greater than 0 when screen time is enabled.');
            return;
        }

        if (totalMinutes > 1440) {
            setError('Daily limit cannot exceed 24 hours.');
            return;
        }

        setSaving(true);
        try {
            await updateScreenTimeSettings({
                isEnabled: enabled,
                dailyLimitMinutes: enabled ? totalMinutes : 0
            });
            await refreshSettings();
            setMessage(enabled
                ? `Screen time limit set to ${totalMinutes >= 60 ? Math.floor(totalMinutes/60) + 'h ' : ''}${totalMinutes % 60}m per day.`
                : 'Screen time limit disabled. You have unlimited usage.'
            );
            setTimeout(() => setMessage(''), 4000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    const formatUsage = (seconds) => {
        if (seconds < 60) return `${seconds}s`;
        const m = Math.floor(seconds / 60);
        if (m < 60) return `${m}m`;
        const h = Math.floor(m / 60);
        const rm = m % 60;
        return `${h}h ${rm}m`;
    };

    return (
        <div className="screentime-settings">
            <h3>Manage Screen Time</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '-10px', marginBottom: '20px', lineHeight: 1.5 }}>
                Stay mindful of your time on SkyNestia—set daily limits if you wish, or continue without any restrictions.
            </p>

            {message && (
                <div style={{ padding: '12px 16px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '10px', marginBottom: '15px', fontSize: '0.9rem' }}>
                    ✅ {message}
                </div>
            )}
            {error && (
                <div style={{ padding: '12px 16px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '10px', marginBottom: '15px', fontSize: '0.9rem' }}>
                    {error}
                </div>
            )}

            {/* Enable/Disable Toggle */}
            <div className="screentime-toggle-row">
                <div className="screentime-toggle-info">
                    <h4>Daily Screen Time Limit</h4>
                    <p>
                        {enabled
                            ? 'Screen time tracking is active. You will receive warnings as you approach your limit.'
                            : 'Currently off — you have unlimited usage. Turn this on to set a daily limit.'}
                    </p>
                </div>
                <label className="screentime-switch">
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(e) => setEnabled(e.target.checked)}
                    />
                    <span className="screentime-slider"></span>
                </label>
            </div>

            {/* Limit Configuration — only shown when enabled */}
            {enabled && (
                <form onSubmit={handleSave}>
                    <div className="screentime-limit-section">
                        <h4>Set Your Daily Limit</h4>
                        <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: '-8px', marginBottom: '14px' }}>
                            Choose how much time you want to allow yourself per day. You'll get warnings at 80% and 90%.
                        </p>
                        <div className="screentime-limit-inputs">
                            <div className="screentime-limit-group">
                                <label>Hours</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={hours}
                                    onChange={(e) => setHours(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="screentime-limit-group">
                                <label>Minutes</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={minutes}
                                    onChange={(e) => setMinutes(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Today's Usage */}
                        <div className="screentime-current-usage">
                            <span>Today's usage</span>
                            <span>{formatUsage(usageSeconds)}</span>
                        </div>
                    </div>

                    {/* Stats Widget */}
                    {limitMinutes > 0 && (
                        <div style={{ marginBottom: '22px' }}>
                            <ScreenTimeStats />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-premium"
                        style={{ width: '100%' }}
                    >
                        {saving ? 'Saving...' : 'Save Screen Time Settings'}
                    </button>
                </form>
            )}

            {/* When disabled, show save button to persist the off state */}
            {!enabled && (
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-premium"
                    style={{ width: '100%', marginTop: '10px' }}
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            )}
        </div>
    );
}
