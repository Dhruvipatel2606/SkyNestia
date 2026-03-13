import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import './Settings.css';

export default function Settings() {
    const navigate = useNavigate();
    const currentUserRaw = sessionStorage.getItem('user') || localStorage.getItem('user');
    const currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
    
    const [activeTab, setActiveTab] = useState('account'); // 'account', 'security', 'danger'
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

    if (!currentUser) {
        navigate('/login');
        return null;
    }

    const clearMessages = () => {
        setMessage('');
        setError('');
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
                    className={`settings-tab ${activeTab === 'danger' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('danger'); clearMessages(); }}
                    style={{ padding: '10px', cursor: 'pointer', borderBottom: activeTab === 'danger' ? '2px solid #dc3545' : 'none', fontWeight: activeTab === 'danger' ? 'bold' : 'normal', color: '#dc3545' }}
                >
                    Danger Zone
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

                        <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--secondary-color)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                            {isLoading ? 'Saving...' : 'Save Profile Changes'}
                        </button>
                    </form>
                </div>
            )}

            {/* TAB: SECURITY & VERIFICATION */}
            {activeTab === 'security' && (
                <div className="settings-section">
                    <h3>Account Security</h3>
                    
                    <div style={{ paddingBottom: '20px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                        <h4 style={{ marginBottom: '15px' }}>Change Password</h4>
                        {currentUser.googleId && !currentUser.password ? (
                            <p style={{ color: 'var(--text-secondary)' }}>You are logged in with Google. Password changes are not applicable.</p>
                        ) : (
                            <form onSubmit={handlePasswordChange}>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>Current Password</label>
                                    <input type="password" value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})} className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)' }} required />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>New Password</label>
                                    <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)' }} required minLength={6} />
                                </div>
                                <div className="form-group" style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px' }}>Confirm New Password</label>
                                    <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} className="form-input" style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid var(--border-color)' }} required minLength={6} />
                                </div>
                                <button type="submit" disabled={isLoading} style={{ padding: '10px 20px', backgroundColor: 'var(--secondary-color)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Update Password
                                </button>
                            </form>
                        )}
                    </div>

                    <div>
                        <h4 style={{ marginBottom: '10px' }}>Verification Status (Blue Tick)</h4>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>Get a verified badge next to your name to show that your account is authentic.</p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>
                            <div>
                                <strong>Status: </strong>
                                <span style={{ textTransform: 'capitalize', color: currentUser.isVerified ? 'green' : (currentUser.verificationStatus === 'pending' ? 'orange' : 'var(--text-color)') }}>
                                    {currentUser.isVerified ? 'Verified ✔️' : (currentUser.verificationStatus || 'Not Verified')}
                                </span>
                            </div>
                            
                            {!currentUser.isVerified && currentUser.verificationStatus !== 'pending' && (
                                <button onClick={handleRequestVerification} disabled={isLoading} style={{ padding: '8px 15px', backgroundColor: 'var(--blue)', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                                    Request Verification
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div style={{ marginTop: '30px' }}>
                        <h4 style={{ marginBottom: '10px' }}>Account Status</h4>
                        <div style={{ padding: '15px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>
                            <strong>Current Role: </strong> <span>{currentUser.isAdmin ? 'Administrator' : 'Standard User'}</span>
                            <br/><br/>
                            <strong>Account State: </strong> <span style={{ textTransform: 'capitalize' }}>{currentUser.accountStatus || 'Active'}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: DANGER ZONE */}
            {activeTab === 'danger' && (
                <div className="settings-section" style={{ border: '1px solid #dc3545' }}>
                    <h3 style={{ color: '#dc3545', borderBottomColor: '#f5c6cb' }}>Danger Zone</h3>
                    
                    <div className="setting-item" style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h4 style={{ margin: '0 0 5px 0' }}>Deactivate Account</h4>
                            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                                Temporarily hide your profile, posts, and interactions.
                            </p>
                        </div>
                        <button onClick={handleDeactivate} disabled={isLoading} style={{ padding: '10px 15px', backgroundColor: '#f0ad4e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Deactivate Account
                        </button>
                    </div>

                    <div className="setting-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h4 style={{ margin: '0 0 5px 0', color: '#dc3545' }}>Delete Account Permanently</h4>
                            <p style={{ margin: 0, fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                                Delete your profile, posts, and entire account history forever.
                            </p>
                        </div>
                        <button onClick={handleDelete} disabled={isLoading} style={{ padding: '10px 15px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Delete Account
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
