import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import {
    fetchScreenTime,
    startScreenTimeSession,
    pingScreenTimeSession,
    endScreenTimeSession,
    overrideScreenTime as overrideAPI
} from '../api/screentimeAPI';

export const ScreenTimeContext = createContext(null);

/**
 * ScreenTimeProvider
 * 
 * Wraps authenticated app content. Key behavior:
 * - On mount: fetches screen time settings from server
 * - If isEnabled === false: does NOTHING (no tracking, no pings, unlimited usage)
 * - If isEnabled === true: starts session, pings every 60s, enforces limits
 */
export default function ScreenTimeProvider({ children, isAuthenticated }) {
    const [state, setState] = useState({
        usageSeconds: 0,
        limitMinutes: 0,
        isEnabled: false,
        warningLevel: null,
        overrideToday: false,
        isLoading: true
    });

    const pingIntervalRef = useRef(null);
    const isInitializedRef = useRef(false);

    const isBlocked = state.isEnabled
        && state.warningLevel === 'blocked'
        && !state.overrideToday;

    // Stop all tracking
    const stopTracking = useCallback(() => {
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
        }
    }, []);

    // Ping server every 60s (only called when enabled)
    const doPing = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const res = await pingScreenTimeSession();
            const data = res.data;
            setState(prev => ({
                ...prev,
                usageSeconds: data.usageTodaySeconds || prev.usageSeconds,
                limitMinutes: data.dailyLimitMinutes || prev.limitMinutes,
                isEnabled: data.isEnabled !== undefined ? data.isEnabled : prev.isEnabled,
                warningLevel: data.warningLevel || null,
                overrideToday: data.overrideToday !== undefined ? data.overrideToday : prev.overrideToday
            }));
        } catch (err) {
            // Silently fail on ping errors
        }
    }, [isAuthenticated]);

    // Start tracking session (only when enabled)
    const startTracking = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const res = await startScreenTimeSession();
            const data = res.data;
            setState(prev => ({
                ...prev,
                usageSeconds: data.usageTodaySeconds || 0,
                limitMinutes: data.dailyLimitMinutes || 0,
                isEnabled: data.isEnabled || false,
                warningLevel: data.warningLevel || null,
                overrideToday: data.overrideToday || false,
                isLoading: false
            }));

            // Only start ping interval if screen time is enabled
            if (data.isEnabled) {
                stopTracking(); // Clear any existing interval
                pingIntervalRef.current = setInterval(doPing, 60000);
            }
        } catch (err) {
            console.error('ScreenTime: Failed to start session', err);
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [isAuthenticated, doPing, stopTracking]);

    // End session
    const endSession = useCallback(() => {
        try {
            endScreenTimeSession().catch(() => {});
        } catch (err) {
            // Silently fail
        }
    }, []);

    // Override for today
    const handleOverride = useCallback(async () => {
        try {
            await overrideAPI();
            setState(prev => ({ ...prev, overrideToday: true }));
        } catch (err) {
            console.error('ScreenTime: Override failed', err);
        }
    }, []);

    // Refresh settings — called after user updates settings in ScreenTimeSettings
    const refreshSettings = useCallback(async () => {
        try {
            const res = await fetchScreenTime();
            const data = res.data;
            const wasEnabled = state.isEnabled;
            const nowEnabled = data.isEnabled || false;

            setState(prev => ({
                ...prev,
                usageSeconds: data.usageTodaySeconds || 0,
                limitMinutes: data.dailyLimitMinutes || 0,
                isEnabled: nowEnabled,
                warningLevel: data.warningLevel || null,
                overrideToday: data.overrideToday || false
            }));

            // If user just enabled screen time, start tracking
            if (!wasEnabled && nowEnabled) {
                await startScreenTimeSession();
                stopTracking();
                pingIntervalRef.current = setInterval(doPing, 60000);
            }
            // If user just disabled, stop tracking
            if (wasEnabled && !nowEnabled) {
                stopTracking();
                endSession();
            }
        } catch (err) {
            console.error('ScreenTime: Refresh failed', err);
        }
    }, [state.isEnabled, doPing, stopTracking, endSession]);

    useEffect(() => {
        if (!isAuthenticated) {
            setState(prev => ({ ...prev, isLoading: false }));
            return;
        }

        if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            startTracking();
        }

        // Pause/resume on visibility change (only matters if enabled)
        const handleVisibilityChange = () => {
            if (!state.isEnabled) return;

            if (document.visibilityState === 'hidden') {
                stopTracking();
                doPing(); // Flush time
            } else if (document.visibilityState === 'visible') {
                if (!pingIntervalRef.current) {
                    doPing();
                    pingIntervalRef.current = setInterval(doPing, 60000);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopTracking();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (state.isEnabled) endSession();
            isInitializedRef.current = false;
        };
    }, [isAuthenticated, startTracking, doPing, stopTracking, endSession, state.isEnabled]);

    const contextValue = {
        ...state,
        isBlocked,
        handleOverride,
        refreshSettings
    };

    return (
        <ScreenTimeContext.Provider value={contextValue}>
            {children}
        </ScreenTimeContext.Provider>
    );
}
