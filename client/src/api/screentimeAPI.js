import API from '../api';

// Fetch screen time settings and today's usage
export const fetchScreenTime = () => API.get('/screentime');

// Update screen time settings
export const updateScreenTimeSettings = (data) => API.put('/screentime/settings', data);

// Session management
export const startScreenTimeSession = () => API.post('/screentime/session/start');
export const pingScreenTimeSession = () => API.post('/screentime/session/ping');
export const endScreenTimeSession = () => API.post('/screentime/session/end');

// Override ("Continue for today")
export const overrideScreenTime = () => API.post('/screentime/override');
