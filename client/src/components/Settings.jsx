import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './Settings.css';

export default function Settings() {
    const navigate = useNavigate();
    const currentUserRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
    const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
    
    const [activeTab, setActiveTab] = useState('account'); // 'account', 'security', 'privacy', 'danger'
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // --- Account Management State ---
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

    // --- Security State ---
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
        showSetup: false
    });

    const [sessions, setSessions] = useState([]);
    
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
    }, [activeTab, faqs.length, legalData.privacy]);

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

    const handleSetup2FA = async () => {
        clearMessages();
        setIsLoading(true);
        try {
            const res = await API.post('/auth/2fa/setup');
            setTwoFactorData({
                ...twoFactorData,
                qrCode: res.data.qrCodeUrl,
                secret: res.data.secret,
                backupCodes: res.data.backupCodes,
                showSetup: true
            });
        } catch (err) {
            setError("Failed to start 2FA setup.");
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
        if (!window.confirm("WARNING: This action is permanent. Are you absolutely sure?")) return;
        setIsLoading(true);
        clearMessages();
        try {
            await API.delete(`/user/${currentUser._id}`, {
                data: { currentUserId: currentUser._id, CurrentUserAdminStatus: currentUser.isAdmin }
            });
            setMessage("Account deleted permanently.");
            setTimeout(() => {
                sessionStorage.clear();
                localStorage.clear();
                window.location.href = '/login';
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to delete account.");
            setIsLoading(false);
        }
    };

    const getProfileImg = (img) => {
        if (!img) return "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png";
        if (img.startsWith("http")) return img;
        return `${API.defaults.baseURL.replace('/api', '')}/images/${img.split('/').pop()}`;
    };

    return (
        <div className="settings-container">
            <h2>Settings</h2>
            
            <div className="settings-tabs" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <div 
                    className={`settings-tab ${activeTab === 'account' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('account'); clearMessages(); }}
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: activeTab === 'account' ? '2px solid var(--secondary-color)' : 'none', fontWeight: activeTab === 'account' ? 'bold' : 'normal' }}
                >
                    Account Management
                </div>
                <div 
                    className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('security'); clearMessages(); }}
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: activeTab === 'security' ? '2px solid var(--secondary-color)' : 'none', fontWeight: activeTab === 'security' ? 'bold' : 'normal' }}
                >
                    Security
                </div>
                <div 
                    className={`settings-tab ${activeTab === 'privacy' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('privacy'); clearMessages(); }}
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: activeTab === 'privacy' ? '2px solid var(--secondary-color)' : 'none', fontWeight: activeTab === 'privacy' ? 'bold' : 'normal' }}
                >
                    Privacy
                </div>
                <div 
                    className={`settings-tab ${activeTab === 'danger' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('danger'); clearMessages(); }}
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: activeTab === 'danger' ? '2px solid #dc3545' : 'none', fontWeight: activeTab === 'danger' ? 'bold' : 'normal', color: '#dc3545' }}
                >
                    Danger Zone
                </div>
                <div 
                    className={`settings-tab ${activeTab === 'support' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('support'); clearMessages(); }}
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: activeTab === 'support' ? '2px solid var(--secondary-color)' : 'none', fontWeight: activeTab === 'support' ? 'bold' : 'normal' }}
                >
                    Help & Support
                </div>
                <div 
                    className={`settings-tab ${activeTab === 'legal' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('legal'); clearMessages(); }}
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: activeTab === 'legal' ? '2px solid var(--secondary-color)' : 'none', fontWeight: activeTab === 'legal' ? 'bold' : 'normal' }}
                >
                    Legal & Policies
                </div>
            </div>

            {message && <div style={{ padding: '10px', backgroundColor: '#d4edda', color: '#155724', borderRadius: '5px', marginBottom: '15px' }}>{message}</div>}
            {error && <div style={{ padding: '10px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '5px', marginBottom: '15px' }}>{error}</div>}

            {/* TAB: ACCOUNT MANAGEMENT */}
            {activeTab === 'account' && (
                <div className="settings-section">
                    <h3>Basic Account Information</h3>
                    <form onSubmit={handleUpdateAccount}>
                        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                            <div className="form-group" style={{ textAlign: 'center', flex: 1 }}>
                                <label>Profile Photo</label>
                                <div className="edit-avatar-preview" style={{ width: '100px', height: '100px', margin: '10px auto', borderRadius: '50%', overflow: 'hidden', backgroundColor: '#ddd' }}>
                                    <img src={previewImage || getProfileImg(currentUser.profilePicture)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <label className="change-photo-btn" style={{ cursor: 'pointer', color: 'var(--secondary-color)', fontSize: '0.9rem' }}>
                                    Change Photo
                                    <input type="file" onChange={handleImageChange} style={{ display: 'none' }} />
                                </label>
                            </div>

                            <div className="form-group" style={{ textAlign: 'center', flex: 2 }}>
                                <label>Cover Photo</label>
                                <div className="edit-avatar-preview" style={{ width: '100%', height: '100px', margin: '10px auto', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#ddd' }}>
                                    {previewCover || currentUser.coverPicture ? (
                                        <img src={previewCover || getProfileImg(currentUser.coverPicture)} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : null}
                                </div>
                                <label className="change-photo-btn" style={{ cursor: 'pointer', color: 'var(--secondary-color)', fontSize: '0.9rem' }}>
                                    Change Cover
                                    <input type="file" onChange={handleCoverChange} style={{ display: 'none' }} />
                                </label>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Username</label>
                            <input name="username" value={accountData.username} onChange={handleAccountChange} className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)' }} required />
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>First Name</label>
                                <input name="firstname" value={accountData.firstname} onChange={handleAccountChange} className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)' }} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '5px' }}>Last Name</label>
                                <input name="lastname" value={accountData.lastname} onChange={handleAccountChange} className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)' }} />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Email Address <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>(Cannot be changed)</span></label>
                            <input type="email" name="email" value={accountData.email} className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-secondary)' }} disabled />
                        </div>

                        <div className="form-group" style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Phone Number <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>(Optional)</span></label>
                            <input type="tel" name="phone" value={accountData.phone} onChange={handleAccountChange} placeholder="+1234567890" className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)' }} />
                        </div>

                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Bio <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>(Optional)</span></label>
                            <textarea name="bio" value={accountData.bio} onChange={handleAccountChange} rows={3} className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)' }} />
                        </div>

                        <button type="submit" disabled={isLoading} className="btn-premium" style={{ width: '100%' }}>
                            {isLoading ? 'Saving...' : 'Save Profile Changes'}
                        </button>
                    </form>
                </div>
            )}

            {/* TAB: PRIVACY */}
            {activeTab === 'privacy' && (
                <div className="settings-section">
                    <h3>Privacy Settings</h3>
                    <form onSubmit={handleUpdatePrivacy}>
                        {/* Account Privacy */}
                        <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 5px 0' }}>Private Account</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        When your account is private, only people you approve can see your photos and videos.
                                    </p>
                                </div>
                                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
                                    <input 
                                        type="checkbox" 
                                        name="isPrivate" 
                                        checked={privacyData.isPrivate} 
                                        onChange={handlePrivacyChange} 
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{ 
                                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                                        backgroundColor: privacyData.isPrivate ? 'var(--secondary-color)' : '#ccc', 
                                        transition: '.4s', borderRadius: '24px' 
                                    }}>
                                        <span style={{ 
                                            position: 'absolute', content: '""', height: '18px', width: '18px', left: '3px', bottom: '3px', 
                                            backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                                            transform: privacyData.isPrivate ? 'translateX(26px)' : 'translateX(0)'
                                        }}></span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* List Visibility */}
                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ marginBottom: '15px' }}>List Visibility</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Hide Followers List</span>
                                    <input type="checkbox" name="hideFollowers" checked={privacyData.hideFollowers} onChange={handlePrivacyChange} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Hide Following List</span>
                                    <input type="checkbox" name="hideFollowing" checked={privacyData.hideFollowing} onChange={handlePrivacyChange} />
                                </div>
                            </div>
                        </div>

                        <div className="section-divider" style={{ margin: '20px 0', height: '1px', backgroundColor: 'var(--border-color)' }}></div>

                        {/* Interactions */}
                        <div style={{ marginBottom: '25px' }}>
                            <h4 style={{ marginBottom: '15px' }}>Interactions</h4>
                            
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Who can message you</label>
                                <select 
                                    name="messaging" 
                                    value={privacyData.messaging} 
                                    onChange={handlePrivacyChange}
                                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                                >
                                    <option value="everyone">Everyone</option>
                                    <option value="followers">Followers Only</option>
                                    <option value="none">No One</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Who can tag you</label>
                                <select 
                                    name="tagging" 
                                    value={privacyData.tagging} 
                                    onChange={handlePrivacyChange}
                                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                                >
                                    <option value="everyone">Everyone</option>
                                    <option value="followers">Followers Only</option>
                                    <option value="none">No One</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Who can comment on your posts</label>
                                <select 
                                    name="commenting" 
                                    value={privacyData.commenting} 
                                    onChange={handlePrivacyChange}
                                    style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}
                                >
                                    <option value="everyone">Everyone</option>
                                    <option value="followers">Followers Only</option>
                                    <option value="none">No One</option>
                                </select>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading} 
                            className="btn-premium"
                            style={{ width: '100%' }}
                        >
                            {isLoading ? 'Saving...' : 'Save Privacy Settings'}
                        </button>
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
                            <button onClick={handleSetup2FA} style={{ padding: '10px 15px', backgroundColor: 'var(--secondary-color)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Enable 2FA
                            </button>
                        )}

                        {twoFactorData.showSetup && (
                            <div style={{ padding: '20px', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: '8px', marginTop: '15px' }}>
                                <h5 style={{ marginBottom: '15px' }}>Scan QR Code</h5>
                                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                                    <img src={twoFactorData.qrCode} alt="QR Code" style={{ border: '5px solid white', borderRadius: '5px' }} />
                                    <div>
                                        <p style={{ fontSize: '0.9rem', marginBottom: '15px' }}>
                                            1. Open your authenticator app (Google Authenticator, Authy, etc.)<br/>
                                            2. Scan this QR code or enter the secret manually: <code>{twoFactorData.secret}</code><br/>
                                            3. Enter the 6-digit code from the app below:
                                        </p>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input 
                                                type="text" 
                                                placeholder="000000" 
                                                value={twoFactorData.token} 
                                                onChange={(e) => setTwoFactorData({...twoFactorData, token: e.target.value})}
                                                style={{ width: '120px', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)', textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px' }}
                                            />
                                            <button onClick={handleVerify2FA} disabled={isLoading} style={{ padding: '10px 20px', backgroundColor: 'var(--secondary-color)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                Verify & Enable
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {twoFactorData.backupCodes.length > 0 && (
                                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '5px' }}>
                                        <h6 style={{ margin: '0 0 10px 0', color: '#856404' }}>Save your Backup Codes!</h6>
                                        <p style={{ fontSize: '0.8rem', color: '#856404', marginBottom: '10px' }}>Use these if you lose access to your authenticator app. Each code can be used once.</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                            {twoFactorData.backupCodes.map((code, idx) => (
                                                <code key={idx} style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{code}</code>
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
                    <div style={{ paddingBottom: '25px', marginBottom: '25px', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h4 style={{ margin: 0 }}>Active Sessions & Devices</h4>
                            <button onClick={handleLogoutAll} style={{ fontSize: '0.85rem', color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                                Logout from all devices
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {sessions.map((session) => (
                                <div key={session._id} className="session-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                        <div style={{ fontSize: '1.8rem' }}>
                                            {session.device?.os?.includes('Windows') ? '💻' : (session.device?.isMobile ? '📱' : '🌐')}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-color)' }}>
                                                {session.device?.browser} on {session.device?.os}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {session.ip} • active {new Date(session.lastActive).toLocaleTimeString()}
                                                {session.isCurrent && <span style={{ marginLeft: '10px', color: '#764ba2', fontWeight: '800' }}>• CURRENT</span>}
                                            </div>
                                        </div>
                                    </div>
                                    {!session.isCurrent && (
                                        <button onClick={() => handleRevokeSession(session._id)} style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: 'rgba(220, 53, 69, 0.1)', border: 'none', color: '#dc3545', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>
                                            Revoke
                                        </button>
                                    )}
                                </div>
                            ))}
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

            {/* TAB: DANGER ZONE */}
            {activeTab === 'danger' && (
                <div className="settings-section danger">
                    <h3 style={{ color: '#dc3545' }}>Danger Zone</h3>
                    
                    <div className="setting-item" style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                    <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h4 style={{ margin: '0 0 5px 0', color: '#dc3545' }}>Delete Account Permanently</h4>
                            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                                Delete your profile, posts, and entire account history forever.
                            </p>
                        </div>
                        <button onClick={handleDelete} disabled={isLoading} className="btn-danger-premium">
                            Delete Account
                        </button>
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
    );
}
