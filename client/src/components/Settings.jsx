import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './Settings.css';
import ScreenTimeSettings from './screenTime/ScreenTimeSettings';
import Logo from './Logo';

export default function Settings() {
    const navigate = useNavigate();
    const currentUserRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
    const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
    
    const [activeTab, setActiveTab] = useState('account'); // 'account', 'security', 'privacy', 'danger'
    const [userProfile, setUserProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const [accountData, setAccountData] = useState({
        username: currentUser?.username || '',
        firstname: currentUser?.firstname || '',
        lastname: currentUser?.lastname || '',
        email: currentUser?.email || '',
        phone: currentUser?.phone || '',
        bio: currentUser?.bio || ''
    });

    const [privacyData, setPrivacyData] = useState({
        isPrivate: currentUser?.isPrivate || false,
        hideFollowers: currentUser?.hideFollowers || false,
        hideFollowing: currentUser?.hideFollowing || false,
        messaging: currentUser?.privacySettings?.messaging || 'everyone',
        tagging: currentUser?.privacySettings?.tagging || 'everyone',
        commenting: currentUser?.privacySettings?.commenting || 'everyone'
    });

    const [imageFile, setImageFile] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [coverFile, setCoverFile] = useState(null);
    const [previewCover, setPreviewCover] = useState(null);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [twoFactorData, setTwoFactorData] = useState({
        isEnabled: currentUser?.twoFactorEnabled || false,
        qrCode: '',
        secret: '',
        token: '',
        backupCodes: [],
        showSetup: false,
        setupMethod: 'totp' // 'totp', 'email', 'sms'
    });

    const [sessions, setSessions] = useState([]);
    const [deletePassword, setDeletePassword] = useState('');
    
    // Support State
    const [reportData, setReportData] = useState({ reason: 'bug', description: '' });
    const [contactData, setContactData] = useState({ subject: '', message: '', category: 'general' });
    const [faqs, setFaqs] = useState([]);
    const [activeFaq, setActiveFaq] = useState(null);
    const [legalData, setLegalData] = useState({ privacy: null, terms: null, cookies: null, standards: null });
    const [activeLegal, setActiveLegal] = useState(null); // 'privacy', 'terms', 'cookies', 'standards'

    if (!currentUser) {
        navigate('/login');
        return null;
    }

    const clearMessages = () => {
        setMessage('');
        setError('');
    };

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const res = await API.get(`/user/${currentUser._id}`);
                const userData = res.data.profile || res.data.user || res.data;
                setUserProfile(userData);
            } catch (err) {
                console.error("Profile fetch fail", err);
            }
        };
        fetchUserProfile();

        if (activeTab === 'security') {
            fetchSessions();
        }
        if (activeTab === 'support' && faqs.length === 0) {
            const fetchFaqs = async () => {
                try {
                    const res = await API.get('/support/faq');
                    setFaqs(res.data);
                } catch (err) {
                    console.error("Failed to fetch FAQs", err);
                }
            };
            fetchFaqs();
        }
        if (activeTab === 'legal' && !legalData.privacy) {
            const fetchLegal = async () => {
                try {
                    const [privacy, terms, cookies, standards] = await Promise.all([
                        API.get('/legal/privacy'),
                        API.get('/legal/terms'),
                        API.get('/legal/cookies'),
                        API.get('/legal/standards')
                    ]);
                    setLegalData({
                        privacy: privacy.data,
                        terms: terms.data,
                        cookies: cookies.data,
                        standards: standards.data
                    });
                } catch (err) {
                    console.error("Failed to fetch legal docs", err);
                }
            };
            fetchLegal();
        }
    }, [activeTab, currentUser._id, faqs.length, legalData.privacy]);

    const fetchSessions = async () => {
        try {
            const res = await API.get('/auth/sessions');
            setSessions(res.data);
        } catch (err) {
            console.error("Failed to fetch sessions", err);
        }
    };

    // --- Handlers: Account ---
    const handleAccountChange = (e) => {
        setAccountData({ ...accountData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
            setPreviewImage(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleCoverChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setCoverFile(e.target.files[0]);
            setPreviewCover(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleUpdateAccount = async (e) => {
        e.preventDefault();
        clearMessages();
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append("username", accountData.username);
            formData.append("firstname", accountData.firstname);
            formData.append("lastname", accountData.lastname);
            formData.append("phone", accountData.phone);
            formData.append("bio", accountData.bio);

            if (imageFile) formData.append("profileImage", imageFile);
            if (coverFile) formData.append("coverImage", coverFile);

            const res = await API.put(`/user/update/${currentUser._id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            const updatedUser = res.data.user || res.data;
            const newUserData = { ...currentUser, ...updatedUser };
            localStorage.setItem('user', JSON.stringify(newUserData));
            sessionStorage.setItem('user', JSON.stringify(newUserData));

            setMessage('Profile updated successfully.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Handlers: Security ---
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        clearMessages();
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return setError("New passwords do not match.");
        }

        setIsLoading(true);
        try {
            await API.post('/user/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setMessage("Password changed successfully.");
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setError(err.response?.data?.message || "Failed to change password.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetup2FA = async (method = 'totp') => {
        clearMessages();
        setIsLoading(true);
        try {
            const res = await API.post('/auth/2fa/setup', { method });
            setTwoFactorData({
                ...twoFactorData,
                qrCode: res.data.qrCodeUrl || '',
                secret: res.data.secret || '',
                backupCodes: res.data.backupCodes,
                showSetup: true,
                setupMethod: method,
                token: '' // Clear token input
            });
            if (method !== 'totp') {
                setMessage(`A verification code has been sent to your ${method === 'email' ? 'email' : 'phone'}.`);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to start 2FA setup.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOTP = async () => {
        clearMessages();
        setIsLoading(true);
        try {
            await API.post('/auth/2fa/resend');
            setMessage("A new verification code has been sent.");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to resend code.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify2FA = async () => {
        clearMessages();
        setIsLoading(true);
        try {
            await API.post('/auth/2fa/verify', { token: twoFactorData.token });
            setTwoFactorData({ ...twoFactorData, isEnabled: true, showSetup: false });
            setMessage("2FA enabled successfully. Please save your backup codes!");
            
            // Update local user
            const newUserData = { ...currentUser, twoFactorEnabled: true };
            localStorage.setItem('user', JSON.stringify(newUserData));
            sessionStorage.setItem('user', JSON.stringify(newUserData));
        } catch (err) {
            setError(err.response?.data?.message || "Invalid 2FA token.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevokeSession = async (sessionId) => {
        if (!window.confirm("Revoke this session? You will be logged out from that device.")) return;
        try {
            await API.delete(`/auth/sessions/${sessionId}`);
            setSessions(sessions.filter(s => s._id !== sessionId));
            setMessage("Session revoked.");
        } catch (err) {
            setError("Failed to revoke session.");
        }
    };

    const handleLogoutAll = async () => {
        if (!window.confirm("Logout from ALL devices? You will need to log in again everywhere.")) return;
        try {
            await API.post('/auth/logout-all');
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = '/login';
        } catch (err) {
            setError("Failed to logout all devices.");
        }
    };

    // --- Handlers: Privacy ---
    const handlePrivacyChange = (e) => {
        const { name, value, type, checked } = e.target;
        setPrivacyData({
            ...privacyData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleUpdatePrivacy = async (e) => {
        e.preventDefault();
        clearMessages();
        setIsLoading(true);
        try {
            const res = await API.put(`/user/update/${currentUser._id}`, {
                isPrivate: privacyData.isPrivate,
                hideFollowers: privacyData.hideFollowers,
                hideFollowing: privacyData.hideFollowing,
                privacySettings: {
                    messaging: privacyData.messaging,
                    tagging: privacyData.tagging,
                    commenting: privacyData.commenting
                }
            });

            const updatedUser = res.data.user || res.data;
            const newUserData = { ...currentUser, ...updatedUser };
            localStorage.setItem('user', JSON.stringify(newUserData));
            sessionStorage.setItem('user', JSON.stringify(newUserData));

            setMessage('Privacy settings updated successfully.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update privacy settings.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestVerification = async () => {
        clearMessages();
        setIsLoading(true);
        try {
            await API.post('/user/verification-request');
            setMessage("Verification request (Blue Tick) submitted successfully.");
            
            // Optimistically update local user to pending
            const newUserData = { ...currentUser, verificationStatus: 'pending' };
            localStorage.setItem('user', JSON.stringify(newUserData));
            sessionStorage.setItem('user', JSON.stringify(newUserData));
            
        } catch (err) {
            setError(err.response?.data?.message || "Failed to submit verification request.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Handlers: Support ---
    const handleReportProblem = async (e) => {
        e.preventDefault();
        clearMessages();
        setIsLoading(true);
        try {
            await API.post('/report', {
                targetType: 'system',
                targetId: currentUser._id, // Using self as dummy target for system reports
                reason: reportData.reason,
                description: reportData.description
            });
            setMessage("Problem reported successfully. Thank you for your feedback!");
            setReportData({ reason: 'bug', description: '' });
        } catch (err) {
            setError(err.response?.data?.message || "Failed to submit report.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleContactSupport = async (e) => {
        e.preventDefault();
        clearMessages();
        setIsLoading(true);
        try {
            await API.post('/support/contact', contactData);
            setMessage("Support request sent! We will contact you via email.");
            setContactData({ subject: '', message: '', category: 'general' });
        } catch (err) {
            setError(err.response?.data?.message || "Failed to send support request.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Handlers: Danger Zone ---
    const handleDeactivate = async () => {
        if (!window.confirm("Are you sure you want to deactivate your account?")) return;
        setIsLoading(true);
        clearMessages();
        try {
            await API.put('/user/deactivate');
            setMessage("Account deactivated successfully. Logging you out...");
            setTimeout(() => {
                sessionStorage.clear();
                localStorage.clear();
                window.location.href = '/login';
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to deactivate account.");
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deletePassword) {
            setError("Identity verification required: Please enter your password to confirm permanent deletion.");
            return;
        }

        const confirmText = "🚨 IRREVOCABLE DELETION WARNING 🚨\n\nThis will instantly and PERMANENTLY erase:\n• Your entire profile & identity\n• Every post, photo, and video you've shared\n• All your interactions, comments, and likes\n• All private messages and chat history\n• Your entire social circle and connections\n\nThere is absolutely NO recovery possible after this. Are you sure you want to proceed?";
        
        if (!window.confirm(confirmText)) return;

        setIsLoading(true);
        clearMessages();
        try {
            await API.delete('/user/delete', {
                data: { password: deletePassword }
            });
            setMessage("Your data has been permanently purged from SkyNestia. Redirecting to start...");
            setTimeout(() => {
                sessionStorage.clear();
                localStorage.clear();
                window.location.href = '/login';
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || "Direct wipe failed. Please verify your password and try again.");
            setIsLoading(false);
        }
    };

    const getProfileImg = (img) => {
        if (!img) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
        if (img.startsWith("http")) return img;
        return `${API.defaults.baseURL.replace('/api', '')}/images/${img.split('/').pop()}`;
    };

    return (
        <div className="settings-container-full">
            <div className="settings-main-header">
                <h1 className="settings-title">Settings</h1>
                <p className="settings-subtitle">Manage your cloud identity and secure your presence.</p>
            </div>

            <div className="settings-tabs">
                {[
                    { id: 'account', label: 'Identity' },
                    { id: 'security', label: 'Security' },
                    { id: 'privacy', label: 'Privacy' },
                    { id: 'screentime', label: 'Insights' },
                    { id: 'support', label: 'Support' },
                    { id: 'legal', label: 'Legal' },
                    { id: 'danger', label: 'Danger', danger: true }
                ].map((tab) => (
                    <div
                        key={tab.id}
                        className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => { setActiveTab(tab.id); clearMessages(); }}
                        style={tab.danger && activeTab !== tab.id ? { color: '#ef4444' } : {}}
                    >
                        {tab.label}
                    </div>
                ))}
            </div>

            <div className="settings-content-flow" key={activeTab}>
                {message && <div style={{ padding: '15px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>{message}</div>}
                {error && <div style={{ padding: '15px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '12px', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

                {/* ACCOUNT TAB */}
                {activeTab === 'account' && (
                    <div className="settings-section">
                        <h3>Identity Configuration</h3>
                        <form onSubmit={handleUpdateAccount}>
                            <div className="settings-grid-row" style={{ marginBottom: '30px' }}>
                                <div className="privacy-card" style={{ cursor: 'default' }}>
                                    <div className="privacy-card-info">
                                        <h4>Public Face</h4>
                                        <p>Manage your handle and how you appear to others in the Nest.</p>
                                        <div style={{ marginTop: '15px' }}>
                                            <input type="text" name="username" value={accountData.username} onChange={handleAccountChange} className="form-input" style={{ width: '100%', marginBottom: '10px' }} placeholder="Handle (@username)" />
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <input type="text" name="firstname" value={accountData.firstname} onChange={handleAccountChange} className="form-input" style={{ flex: 1 }} placeholder="First Name" />
                                                <input type="text" name="lastname" value={accountData.lastname} onChange={handleAccountChange} className="form-input" style={{ flex: 1 }} placeholder="Last Name" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="privacy-card" style={{ cursor: 'default' }}>
                                    <div className="privacy-card-info">
                                        <h4>Your Story</h4>
                                        <p>Share a bit about yourself with the SkyNestia community.</p>
                                        <textarea 
                                            name="bio" 
                                            value={accountData.bio} 
                                            onChange={handleAccountChange} 
                                            className="form-input" 
                                            rows={5} 
                                            style={{ width: '100%', marginTop: '15px' }} 
                                            placeholder="Write something inspiring..." 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="settings-grid-row" style={{ marginBottom: '40px' }}>
                                <div className="privacy-card" style={{ cursor: 'default' }}>
                                    <div className="privacy-card-info">
                                        <h4>Anchored Details</h4>
                                        <p>Primary contact methods for system notifications.</p>
                                        <div style={{ marginTop: '15px' }}>
                                            <input type="email" value={accountData.email} className="form-input" style={{ width: '100%', marginBottom: '10px', opacity: 0.6, cursor: 'not-allowed' }} disabled />
                                            <input type="tel" name="phone" value={accountData.phone} onChange={handleAccountChange} className="form-input" style={{ width: '100%' }} placeholder="Mobile (+123...)" />
                                        </div>
                                    </div>
                                </div>
                                <div className="privacy-card" style={{ cursor: 'default' }}>
                                    <div className="privacy-card-info">
                                        <h4>Visual Assets</h4>
                                        <p>High-resolution imagery for your cloud presence.</p>
                                        <div style={{ marginTop: '15px', display: 'flex', gap: '12px', flexDirection: 'column' }}>
                                            <label className="btn-secondary-premium" style={{ width: '100%', cursor: 'pointer', textAlign: 'center', background: '#f0f9ff', color: 'var(--secondary)', border: '1px solid var(--accent)' }}>
                                                ✨ Update Avatar
                                                <input type="file" onChange={handleImageChange} style={{ display: 'none' }} />
                                            </label>
                                            <label className="btn-secondary-premium" style={{ width: '100%', cursor: 'pointer', textAlign: 'center', background: '#f0f9ff', color: 'var(--secondary)', border: '1px solid var(--accent)' }}>
                                                🖼️ Update Banner
                                                <input type="file" onChange={handleCoverChange} style={{ display: 'none' }} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="privacy-tab-footer" style={{ padding: '40px', background: 'transparent' }}>
                                <button type="submit" disabled={isLoading} className="btn-premium" style={{ padding: '18px 80px', fontSize: '1.1rem' }}>
                                    {isLoading ? '🚀 Anchoring Changes...' : 'Save Sky Identity'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

            {/* TAB: PRIVACY */}
            {activeTab === 'privacy' && (
                <div className="settings-section">
                    <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ margin: 0 }}>Privacy Center</h3>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Manage who can see your content and how people interact with you.</p>
                    </div>

                    <form onSubmit={handleUpdatePrivacy} className="privacy-settings-grid">
                        {/* 1. Account Privacy */}
                        <div>
                            <h5 style={{ margin: '0 0 15px 0', fontSize: '0.9rem', color: '#667eea', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Account Status</h5>
                            <div className="privacy-card">
                                <div className="privacy-card-info">
                                    <h4>Private Account</h4>
                                    <p>When your account is private, only people you approve can see your photos and videos. Your existing followers won't be affected.</p>
                                </div>
                                <label className="premium-switch">
                                    <input 
                                        type="checkbox" 
                                        name="isPrivate" 
                                        checked={privacyData.isPrivate} 
                                        onChange={handlePrivacyChange} 
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>

                        {/* 2. List Visibility */}
                        <div>
                            <h5 style={{ margin: '30px 0 15px 0', fontSize: '0.9rem', color: '#667eea', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Visibility & Discovery</h5>
                            <div className="settings-grid-row">
                                <div className="privacy-card">
                                    <div className="privacy-card-info">
                                        <h4>Hide Followers List</h4>
                                        <p>Don't show who is following you on your profile. Only you will be able to see your full followers list.</p>
                                    </div>
                                    <label className="premium-switch">
                                        <input type="checkbox" name="hideFollowers" checked={privacyData.hideFollowers} onChange={handlePrivacyChange} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div className="privacy-card">
                                    <div className="privacy-card-info">
                                        <h4>Hide Following List</h4>
                                        <p>Conceal the list of people you follow. This helps maintain your personal browsing privacy.</p>
                                    </div>
                                    <label className="premium-switch">
                                        <input type="checkbox" name="hideFollowing" checked={privacyData.hideFollowing} onChange={handlePrivacyChange} />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* 3. Interactions */}
                        <div>
                            <h5 style={{ margin: '30px 0 15px 0', fontSize: '0.9rem', color: '#667eea', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Interactions & Controls</h5>
                            <div className="settings-grid-row">
                                <div className="select-card">
                                    <label>Direct Messaging</label>
                                    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '15px' }}>Control who can start new conversations with you.</p>
                                    <select 
                                        name="messaging" 
                                        value={privacyData.messaging} 
                                        onChange={handlePrivacyChange}
                                        className="form-input"
                                    >
                                        <option value="everyone">Everyone</option>
                                        <option value="followers">Followers Only</option>
                                        <option value="none">No One</option>
                                    </select>
                                </div>

                                <div className="select-card">
                                    <label>Tags & Mentions</label>
                                    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '15px' }}>Decide who can tag you in their posts and stories.</p>
                                    <select 
                                        name="tagging" 
                                        value={privacyData.tagging} 
                                        onChange={handlePrivacyChange}
                                        className="form-input"
                                    >
                                        <option value="everyone">Everyone</option>
                                        <option value="followers">Followers Only</option>
                                        <option value="none">No One</option>
                                    </select>
                                </div>

                                <div className="select-card">
                                    <label>Comments Control</label>
                                    <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '15px' }}>Manage who is allowed to comment on your public content.</p>
                                    <select 
                                        name="commenting" 
                                        value={privacyData.commenting} 
                                        onChange={handlePrivacyChange}
                                        className="form-input"
                                    >
                                        <option value="everyone">Everyone</option>
                                        <option value="followers">Followers Only</option>
                                        <option value="none">No One</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="privacy-tab-footer" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>Changes to privacy settings take effect immediately after saving.</p>
                            <button 
                                type="submit" 
                                disabled={isLoading} 
                                className="btn-premium"
                                style={{ padding: '14px 60px', fontSize: '1.1rem', borderRadius: '14px', boxShadow: '0 8px 25px rgba(102, 126, 234, 0.25)' }}
                            >
                                {isLoading ? '🚀 Applying Changes...' : 'Save Privacy Configuration'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* TAB: SECURITY & VERIFICATION */}
            {activeTab === 'security' && (
                <div className="settings-section">
                    <h3>Account Security</h3>
                    
                    {/* Password Section */}
                    <div style={{ paddingBottom: '25px', marginBottom: '25px', borderBottom: '1px solid var(--border-color)' }}>
                        <h4 style={{ marginBottom: '15px' }}>Change Password</h4>
                        {currentUser.googleId && !currentUser.password ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>You are logged in with Google. Password changes are not applicable.</p>
                        ) : (
                            <form onSubmit={handlePasswordChange}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Current Password</label>
                                        <input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }} required />
                                    </div>
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>New Password</label>
                                        <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }} required minLength={6} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Confirm New Password</label>
                                    <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }} required minLength={6} />
                                </div>
                                <button type="submit" disabled={isLoading} className="btn-premium">
                                    {isLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Two-Factor Authentication Section */}
                    <div style={{ paddingBottom: '25px', marginBottom: '25px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <div>
                                <h4 style={{ margin: '0 0 5px 0' }}>Two-Factor Authentication (2FA)</h4>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Add an extra layer of security to your account by requiring a code from your phone.
                                </p>
                            </div>
                            <span style={{ 
                                padding: '4px 10px', borderRadius: '15px', fontSize: '0.75rem', fontWeight: 'bold',
                                backgroundColor: twoFactorData.isEnabled ? '#d4edda' : '#f8d7da',
                                color: twoFactorData.isEnabled ? '#155724' : '#721c24'
                            }}>
                                {twoFactorData.isEnabled ? 'ENABLED' : 'DISABLED'}
                            </span>
                        </div>

                        {!twoFactorData.isEnabled && !twoFactorData.showSetup && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>Choose how you'd like to receive your security codes:</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                    <button onClick={() => handleSetup2FA('totp')} className="setup-method-btn">
                                        <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>📱</div>
                                        <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Authenticator</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Google/Authy</div>
                                    </button>
                                    <button onClick={() => handleSetup2FA('email')} className="setup-method-btn">
                                        <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>📧</div>
                                        <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>Email</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{currentUser?.email?.replace(/(.{2}).*(@.*)/, "$1***$2")}</div>
                                    </button>
                                    <button onClick={() => handleSetup2FA('sms')} className="setup-method-btn">
                                        <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>💬</div>
                                        <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>SMS</div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{currentUser?.phone ? `Ends in ${currentUser.phone.slice(-4)}` : "Set phone first"}</div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {twoFactorData.showSetup && (
                            <div style={{ padding: '24px', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '14px', marginTop: '15px', border: '1px solid rgba(118, 75, 162, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h5 style={{ margin: 0, fontSize: '1.1rem' }}>
                                        {twoFactorData.setupMethod === 'totp' ? 'Scan QR Code' : `Verify ${twoFactorData.setupMethod === 'email' ? 'Email' : 'SMS'}`}
                                    </h5>
                                    <button onClick={() => setTwoFactorData({...twoFactorData, showSetup: false})} style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Cancel</button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {twoFactorData.setupMethod === 'totp' ? (
                                        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                                            <img src={twoFactorData.qrCode} alt="QR Code" style={{ border: '8px solid white', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <div>
                                                <p style={{ fontSize: '0.9rem', marginBottom: '15px', lineHeight: '1.6' }}>
                                                    1. Open your authenticator app (Google Authenticator, Authy, etc.)<br/>
                                                    2. Scan this QR code or enter the secret manually: <code>{twoFactorData.secret}</code><br/>
                                                    3. Enter the 6-digit code from the app below:
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ padding: '10px 0' }}>
                                            <p style={{ fontSize: '0.95rem', marginBottom: '15px' }}>
                                                A 6-digit verification code has been sent to your <strong>{twoFactorData.setupMethod === 'email' ? 'email address' : 'phone number'}</strong>. Enter it below to enable 2FA.
                                            </p>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <input 
                                            type="text" 
                                            placeholder="000000" 
                                            value={twoFactorData.token} 
                                            onChange={(e) => setTwoFactorData({...twoFactorData, token: e.target.value})}
                                            style={{ width: '140px', padding: '12px', borderRadius: '10px', border: '2px solid #eee', textAlign: 'center', fontSize: '1.3rem', letterSpacing: '4px', fontWeight: '800' }}
                                        />
                                        <button onClick={handleVerify2FA} disabled={isLoading} className="btn-premium" style={{ height: '50px', padding: '0 25px' }}>
                                            {isLoading ? 'Verifying...' : 'Enable 2FA'}
                                        </button>
                                    </div>

                                    {(twoFactorData.setupMethod === 'email' || twoFactorData.setupMethod === 'sms') && (
                                        <button onClick={handleResendOTP} disabled={isLoading} style={{ background: 'none', border: 'none', color: 'var(--secondary-color)', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', width: 'fit-content' }}>
                                            Didn't receive code? Resend
                                        </button>
                                    )}
                                </div>

                                {twoFactorData.backupCodes.length > 0 && (
                                    <div style={{ marginTop: '25px', padding: '18px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '12px' }}>
                                        <h6 style={{ margin: '0 0 8px 0', color: '#856404', fontSize: '0.95rem' }}>Save your Backup Codes!</h6>
                                        <p style={{ fontSize: '0.85rem', color: '#856404', marginBottom: '12px' }}>Use these if you lose access to your {twoFactorData.setupMethod === 'totp' ? 'authenticator app' : 'phone'}. Each code can be used once.</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            {twoFactorData.backupCodes.map((code, idx) => (
                                                <code key={idx} style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#333', background: 'rgba(255,255,255,0.5)', padding: '4px 8px', borderRadius: '4px', textAlign: 'center' }}>{code}</code>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {twoFactorData.isEnabled && (
                            <button onClick={() => window.confirm("Disabling 2FA makes your account less secure. Are you sure?")} style={{ padding: '8px 15px', backgroundColor: 'transparent', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer' }}>
                                Disable 2FA
                            </button>
                        )}
                    </div>

                    {/* Active Sessions Section */}
                    <div style={{ paddingBottom: '35px', marginBottom: '35px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Active Sessions & Devices</h4>
                                <p style={{ margin: '6px 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                                    Manage and revoke access from other devices.
                                </p>
                            </div>
                            <button onClick={handleLogoutAll} style={{ fontSize: '0.85rem', color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', padding: '8px 12px', borderRadius: '8px', transition: 'background 0.2s' }} onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(220, 53, 69, 0.05)'} onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}>
                                Logout from all devices
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* This Device Section */}
                            {sessions.find(s => s.isCurrent) && (
                                <div>
                                    <h5 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#667eea', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>This Device</h5>
                                    {sessions.filter(s => s.isCurrent).map(session => (
                                        <div key={session._id} className="session-item current" style={{ borderLeft: '4px solid #667eea' }}>
                                            <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                                                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(118, 75, 162, 0.1), rgba(102, 126, 234, 0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', position: 'relative' }}>
                                                    {session.device?.os?.includes('Windows') ? '💻' : (session.device?.browser?.includes('Chrome') ? '🌐' : (session.device?.isMobile ? '📱' : '💻'))}
                                                    <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', background: '#22c55e', border: '2px solid white', borderRadius: '50%' }}></span>
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        {session.device?.browser || 'Unknown Browser'} on {session.device?.os || 'Unknown OS'}
                                                        <span className="current-device-badge">ACTIVE NOW</span>
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                                        {session.ip} • Last active: {new Date(session.lastActive).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Other Devices Section */}
                            <div>
                                <h5 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>Other Logged-in Devices</h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {sessions.filter(s => !s.isCurrent).length > 0 ? (
                                        sessions.filter(s => !s.isCurrent).map(session => (
                                            <div key={session._id} className="session-item">
                                                <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                                                        {session.device?.os?.includes('Windows') ? '💻' : (session.device?.browser?.includes('Chrome') ? '🌐' : (session.device?.isMobile ? '📱' : '💻'))}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-color)' }}>
                                                            {session.device?.browser || 'Unknown Browser'} on {session.device?.os || 'Unknown OS'}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                            {session.ip} • Last active: {new Date(session.lastActive).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRevokeSession(session._id)} 
                                                    className="session-revoke-btn"
                                                    title="Logout from this device"
                                                >
                                                    Logout
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem', border: '1px dashed #eee' }}>
                                            No other active sessions found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Verification Section */}
                    <div style={{ paddingBottom: '25px', marginBottom: '25px', borderBottom: '1px solid #eee' }}>
                        <h4 style={{ marginBottom: '10px' }}>Identity Verification</h4>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '0.9rem' }}>Get a verified badge next to your name to show that your account is authentic.</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '15px', border: '1px solid #eee' }}>
                            <div>
                                <strong style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block' }}>CURRENT STATUS</strong>
                                <span style={{ textTransform: 'uppercase', fontSize: '1rem', fontWeight: '800', color: currentUser.isVerified ? '#28a745' : (currentUser.verificationStatus === 'pending' ? '#fd7e14' : 'var(--text-color)') }}>
                                    {currentUser.isVerified ? 'Verified ✔️' : (currentUser.verificationStatus || 'Not Verified')}
                                </span>
                            </div>
                            {!currentUser.isVerified && currentUser.verificationStatus !== 'pending' && (
                                <button onClick={handleRequestVerification} disabled={isLoading} className="btn-premium">
                                    Apply Now
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: SCREEN TIME */}
            {activeTab === 'screentime' && (
                <div className="settings-section">
                    <ScreenTimeSettings />
                </div>
            )}

            {/* TAB: DANGER ZONE */}
            {activeTab === 'danger' && (
                <div className="settings-section danger">
                    <h3 style={{ color: '#dc3545' }}>Danger Zone</h3>
                    
                    <div className="setting-item" style={{ marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h4 style={{ margin: '0 0 5px 0' }}>Deactivate Account</h4>
                            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                                Temporarily hide your profile, posts, and interactions.
                            </p>
                        </div>
                        <button onClick={handleDeactivate} disabled={isLoading} className="btn-danger-premium" style={{ backgroundColor: '#f0ad4e' }}>
                            Deactivate
                        </button>
                    </div>

                    <div className="setting-item" style={{ padding: '30px', background: '#fffafb', border: '1px solid #ffebeb', borderRadius: '24px' }}>
                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ margin: '0 0 10px 0', color: '#dc3545', fontSize: '1.2rem', fontWeight: '800' }}>Permanently Wipe Identity</h4>
                            <p style={{ margin: 0, fontSize: '0.95em', color: '#64748b', lineHeight: '1.6' }}>
                                This action is absolute. Your profile, handles, posts, messages, and presence will be completely removed from the SkyNestia cloud forever.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <input 
                                type="password" 
                                placeholder="Authorize with your password" 
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                className="form-input"
                                style={{ flex: 1, minWidth: '280px', border: '2px solid #ffcfcf !important' }}
                            />
                            <button 
                                onClick={handleDelete} 
                                disabled={isLoading || !deletePassword} 
                                className="btn-danger-premium"
                                style={{ padding: '14px 40px', borderRadius: '12px', fontSize: '1rem', background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', boxShadow: '0 8px 15px rgba(225, 29, 72, 0.15)', height: '52px' }}
                            >
                                {isLoading ? 'Wiping Cloud Data...' : 'Permanent Wipe'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: HELP & SUPPORT */}
            {activeTab === 'support' && (
                <div className="settings-section">
                    <h3 className="section-title">Help & Support</h3>
                    
                    {/* Help Center Section */}
                    <div style={{ marginBottom: '40px' }}>
                        <h4>Help Center</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                            <div className="support-card" onClick={() => window.open('https://help.skynestia.com', '_blank')}>
                                <span>📚</span>
                                <div>
                                    <h5>Knowledge Base</h5>
                                    <p>Detailed guides on using SkyNestia.</p>
                                </div>
                            </div>
                            <div className="support-card" onClick={() => window.open('https://safety.skynestia.com', '_blank')}>
                                <span>🛡️</span>
                                <div>
                                    <h5>Safety Center</h5>
                                    <p>Tips on staying safe online.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FAQ Section */}
                    <div style={{ marginBottom: '40px' }}>
                        <h4 style={{ marginBottom: '20px' }}>Frequently Asked Questions</h4>
                        <div className="faq-list">
                            {faqs.map((faq, idx) => (
                                <div key={idx} className={`faq-item ${activeFaq === idx ? 'open' : ''}`} onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}>
                                    <div className="faq-question">
                                        <span>{faq.question}</span>
                                        <i className={`fas fa-chevron-${activeFaq === idx ? 'up' : 'down'}`}></i>
                                    </div>
                                    {activeFaq === idx && <div className="faq-answer">{faq.answer}</div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '40px' }}>
                        {/* Report Problem Form */}
                        <div className="support-form-container">
                            <h4>Report a Problem</h4>
                            <form onSubmit={handleReportProblem}>
                                <div className="form-group">
                                    <label>What's wrong?</label>
                                    <select 
                                        value={reportData.reason} 
                                        onChange={(e) => setReportData({...reportData, reason: e.target.value})}
                                        className="form-input"
                                    >
                                        <option value="bug">Technical Bug</option>
                                        <option value="feedback">Product Feedback</option>
                                        <option value="harassment">General Report</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Details</label>
                                    <textarea 
                                        placeholder="Describe the issue..." 
                                        value={reportData.description}
                                        onChange={(e) => setReportData({...reportData, description: e.target.value})}
                                        className="form-input"
                                        rows={4}
                                        required
                                    />
                                </div>
                                <button type="submit" disabled={isLoading} className="btn-premium">Submit Report</button>
                            </form>
                        </div>

                        {/* Contact Support Form */}
                        <div className="support-form-container">
                            <h4>Contact Support</h4>
                            <form onSubmit={handleContactSupport}>
                                <div className="form-group">
                                    <label>Subject</label>
                                    <input 
                                        type="text" 
                                        placeholder="Briefly state your issue" 
                                        value={contactData.subject}
                                        onChange={(e) => setContactData({...contactData, subject: e.target.value})}
                                        className="form-input"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Message</label>
                                    <textarea 
                                        placeholder="How can we help you?" 
                                        value={contactData.message}
                                        onChange={(e) => setContactData({...contactData, message: e.target.value})}
                                        className="form-input"
                                        rows={4}
                                        required
                                    />
                                </div>
                                <button type="submit" disabled={isLoading} className="btn-premium">Send Message</button>
                            </form>
                        </div>
                    </div>

                    {/* Community Guidelines */}
                    <div className="guidelines-section">
                        <h4>Community Guidelines</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                            SkyNestia is built on respect and authenticity. By using our platform, you agree to:
                        </p>
                        <ul className="guidelines-list">
                            <li>Be kind and respectful to others.</li>
                            <li>No spam, scams, or misleading content.</li>
                            <li>Respect intellectual property rights.</li>
                            <li>No hate speech or harassment.</li>
                            <li>Post content that is safe for all audiences.</li>
                        </ul>
                        <button className="btn-secondary-premium" style={{ width: 'auto' }}>Read Full Guidelines</button>
                    </div>
                </div>
            )}

            {/* TAB: LEGAL & POLICIES */}
            {activeTab === 'legal' && (
                <div className="settings-section">
                    <h3 className="section-title">Legal & Policies</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '0.9rem' }}>
                        Review our official documents to understand your rights and our responsibilities.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                        {[
                            { id: 'privacy', title: 'Privacy Policy', icon: '🔒' },
                            { id: 'terms', title: 'Terms of Use', icon: '📝' },
                            { id: 'cookies', title: 'Cookie Policy', icon: '🍪' },
                            { id: 'standards', title: 'Community Standards', icon: '👥' }
                        ].map(item => (
                            <div 
                                key={item.id} 
                                className={`support-card ${activeLegal === item.id ? 'active' : ''}`}
                                onClick={() => setActiveLegal(activeLegal === item.id ? null : item.id)}
                                style={{ border: activeLegal === item.id ? '2px solid var(--secondary-color)' : '1px solid #edf2f7' }}
                            >
                                <span>{item.icon}</span>
                                <div>
                                    <h5>{item.title}</h5>
                                    <p>View full details</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {activeLegal && legalData[activeLegal] && (
                        <div className="legal-content-view" style={{ background: '#f8f9fa', padding: '30px', borderRadius: '20px', animation: 'fadeIn 0.3s ease' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h4 style={{ margin: 0 }}>{legalData[activeLegal].title}</h4>
                                <span style={{ fontSize: '0.8rem', color: '#666' }}>Updated: {legalData[activeLegal].lastUpdated}</span>
                            </div>
                            <div className="policy-sections" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {legalData[activeLegal].sections.map((section, idx) => (
                                    <div key={idx}>
                                        <h5 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: '700' }}>{section.heading}</h5>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#444', lineHeight: '1.6' }}>{section.content}</p>
                                    </div>
                                ))}
                            </div>
                            <button 
                                className="btn-secondary-premium" 
                                style={{ marginTop: '25px', width: 'auto' }}
                                onClick={() => setActiveLegal(null)}
                            >
                                Close Document
                            </button>
                        </div>
                    )}

                    <div style={{ marginTop: '40px', padding: '20px', borderTop: '1px solid #eee', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.8rem', color: '#999' }}>
                            © 2026 SkyNestia Inc. All rights reserved. <br/>
                            Designated trademarks and brands are the property of their respective owners.
                        </p>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}
