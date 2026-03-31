import { useContext } from 'react';
import { ScreenTimeContext } from '../providers/ScreenTimeProvider';

/**
 * Custom hook to access screen time state and actions.
 * 
 * Returns:
 * - usageSeconds: number — total seconds used today
 * - limitMinutes: number — daily limit in minutes (0 = unlimited)
 * - isEnabled: boolean — whether screen time tracking is enabled
 * - warningLevel: null | 'soft' | 'hard' | 'blocked'
 * - isBlocked: boolean — true if limit reached AND not overridden
 * - overrideToday: boolean — true if user clicked "Continue"
 * - isLoading: boolean
 * - handleOverride: () => Promise — call to override for today
 * - refreshSettings: () => Promise — call after updating settings
 */
const useScreenTime = () => {
    const context = useContext(ScreenTimeContext);
    if (!context) {
        // Return safe defaults when used outside provider (e.g., login page)
        return {
            usageSeconds: 0,
            limitMinutes: 0,
            isEnabled: false,
            warningLevel: null,
            isBlocked: false,
            overrideToday: false,
            isLoading: false,
            handleOverride: async () => {},
            refreshSettings: async () => {}
        };
    }
    return context;
};

export default useScreenTime;
