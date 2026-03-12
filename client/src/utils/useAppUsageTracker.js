import { useEffect, useRef } from 'react';
import API from '../api';

const useAppUsageTracker = (isAuthenticated) => {
    const timeSpentRef = useRef(0);
    const lastSyncTimeRef = useRef(Date.now());
    const intervalRef = useRef(null);

    const syncUsage = async () => {
        if (!isAuthenticated || timeSpentRef.current === 0) return;

        const timeToSync = timeSpentRef.current;
        const today = new Date().toISOString().split('T')[0];

        try {
            await API.put('/user/activity/usage', {
                date: today,
                timeSpent: timeToSync,
            });
            // Reset after sync
            timeSpentRef.current = 0;
            lastSyncTimeRef.current = Date.now();
        } catch (error) {
            console.error('Failed to sync app usage', error);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        const startTracking = () => {
            if (!intervalRef.current) {
                intervalRef.current = setInterval(() => {
                    timeSpentRef.current += 1;

                    // Sync every 60 seconds of active usage
                    if (timeSpentRef.current >= 60) {
                        syncUsage();
                    }
                }, 1000);
            }
        };

        const stopTracking = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                startTracking();
            } else {
                stopTracking();
                syncUsage(); // Sync when hiding tab
            }
        };

        const handleBeforeUnload = () => {
            syncUsage(); // Try to sync on close, though fetch/XHR might be cancelled
        };

        // Start tracking initially if visible
        if (document.visibilityState === 'visible') {
            startTracking();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            stopTracking();
            syncUsage();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isAuthenticated]);
};

export default useAppUsageTracker;
