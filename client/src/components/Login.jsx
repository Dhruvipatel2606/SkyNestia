import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API from '../api'
import Logo from './Logo'
import './Login.css'

export default function Login({ setUser }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [twoFactorCode, setTwoFactorCode] = useState('')
    const [requires2FA, setRequires2FA] = useState(false)
    const [tempToken, setTempToken] = useState('')
    const [twoFactorMethod, setTwoFactorMethod] = useState('totp')
    const [twoFactorMessage, setTwoFactorMessage] = useState('')
    const [error, setError] = useState('')
    const [infoMessage, setInfoMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const [recentUser, setRecentUser] = useState(null)
    const [viewMode, setViewMode] = useState('recent')

    const navigate = useNavigate()

    useEffect(() => {
        const saved = localStorage.getItem('user');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setRecentUser(parsed);
                setUsername(parsed.username);
            } catch (e) {
                console.error("Failed to parse recent user", e);
            }
        }
    }, [])

    const handleSubmit = async (e) => {
        if (e) e.preventDefault()
        setError('')
        setIsLoading(true)
        const usernameTrim = (username || '').trim()

        try {
            const res = await API.post('/auth/login', {
                username: usernameTrim,
                password,
                code: requires2FA ? twoFactorCode : undefined
            });
            const data = res.data;

            if (data.requires2FA) {
                setRequires2FA(true);
                setTempToken(data.tempToken);
                setTwoFactorMethod(data.method || 'totp');
                setTwoFactorMessage(data.message || 'Enter your verification code');
                setIsLoading(false);
                return;
            }

            if (data.user) {
                const userStr = JSON.stringify(data.user);
                sessionStorage.setItem('user', userStr);
                localStorage.setItem('user', userStr);
                if (setUser) setUser(data.user);
            }
            if (data.token) {
                sessionStorage.setItem('token', data.token);
                localStorage.setItem('token', data.token);
            }
            navigate('/feed');
        } catch (err) {
            setError(err.response?.data?.message || 'Network error. Please try again.');
            setIsLoading(false);
            if (viewMode === 'recent') setViewMode('standard');
        }
    }

    const handleContinueAs = () => {
        if (!password) {
            setViewMode('standard');
            return;
        }
        handleSubmit();
    }

    const handleResendOTP = async () => {
        setError('');
        setInfoMessage('');
        setIsLoading(true);
        try {
            await API.post('/auth/2fa/resend', {}, {
                headers: { Authorization: `Bearer ${tempToken}` }
            });
            setInfoMessage("A new verification code has been sent.");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to resend code.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="login-split-container">
            <div className="hero-left">
                <div style={{ position: 'absolute', top: '50px', left: '80px', animation: 'fadeInUp 0.8s ease backwards' }}>
                    <Logo size={50} showText={true} />
                </div>
                <h1 className="hero-headline">
                    See everyday moments from your <span className="gradient-text-accent">close friends</span>.
                </h1>

                <div className="story-stack-visual">
                    <div className="story-card-mock">
                        <img src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=400" alt="mock" />
                        <span className="story-overlay-icon">❤️</span>
                    </div>
                    <div className="story-card-mock">
                        <img src="https://images.unsplash.com/photo-1521747116042-5a810fda9664?auto=format&fit=crop&q=80&w=400" alt="mock" />
                        <span className="story-overlay-icon">⭐</span>
                    </div>
                    <div className="story-card-mock">
                        <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=400" alt="mock" />
                        <span className="story-overlay-icon">🔥</span>
                    </div>
                </div>
            </div>

            <div className="login-right">
                {recentUser && viewMode === 'recent' && !requires2FA ? (
                    <div className="account-switcher-view">
                        <div className="recent-user-avatar">
                            <img src={recentUser.profilePicture ? `http://localhost:5173/images/${recentUser.profilePicture}` : "https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png"} alt="profile" />
                        </div>
                        <div className="handle-display">@{recentUser.username}</div>

                        <div className="login-btn-group">
                            <button
                                className="btn-auth-full btn-auth-primary"
                                onClick={handleContinueAs}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Anchoring...' : `Continue as ${recentUser.username}`}
                            </button>
                            <button
                                className="btn-auth-full btn-auth-secondary"
                                onClick={() => setViewMode('standard')}
                                disabled={isLoading}
                                style={{ marginTop: '12px' }}
                            >
                                Use another profile
                            </button>
                        </div>

                        <p style={{ marginTop: '45px', fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                            Don't have an account? <Link to="/register" style={{ color: '#1e40af', fontWeight: '800' }}>Create new account</Link>
                        </p>
                    </div>
                ) : (
                    <div className="auth-card-modern" style={{ width: '100%', maxWidth: '350px' }}>
                        <div style={{ marginBottom: '35px', display: 'flex', justifyContent: 'center' }}>
                            <Logo size={80} />
                        </div>
                        <h2 style={{ marginBottom: '8px', fontSize: '2rem', color: '#0f172a' }}>Sign In</h2>
                        <p className="muted" style={{ marginBottom: '35px', color: '#64748b', fontWeight: '500' }}>{requires2FA ? 'Enter verification code' : 'Reconnect with your SkyNestia community'}</p>

                        <form onSubmit={handleSubmit} className="form" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {!requires2FA ? (
                                <>
                                    <input
                                        className="form-input"
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                        placeholder="Username or Email"
                                        disabled={isLoading}
                                        style={{ padding: '16px', borderRadius: '12px' }}
                                    />
                                    <input
                                        className="form-input"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="Password"
                                        disabled={isLoading}
                                        style={{ padding: '16px', borderRadius: '12px' }}
                                    />
                                </>
                            ) : (
                                <input
                                    className="form-input"
                                    type="text"
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value)}
                                    required
                                    placeholder="000000"
                                    style={{ textAlign: 'center', fontSize: '1.8rem', letterSpacing: '8px', padding: '18px', borderRadius: '14px' }}
                                    disabled={isLoading}
                                    autoFocus
                                />
                            )}

                            {error && <div className="error" style={{ marginTop: '10px', color: '#be123c', fontSize: '0.9rem', fontWeight: '600', textAlign: 'center' }}>{error}</div>}
                            {infoMessage && <div className="success" style={{ marginTop: '10px', color: '#15803d', fontSize: '0.9rem', fontWeight: '600', textAlign: 'center' }}>{infoMessage}</div>}

                            <button className="btn-auth-full btn-auth-primary" type="submit" disabled={isLoading} style={{ marginTop: '15px' }}>
                                {isLoading ? 'Processing...' : (requires2FA ? 'Verify Identity' : 'Log In')}
                            </button>

                            {requires2FA && (twoFactorMethod === 'email' || twoFactorMethod === 'sms') && (
                                <button
                                    type="button"
                                    onClick={handleResendOTP}
                                    disabled={isLoading}
                                    style={{ background: 'none', border: 'none', color: '#1e40af', fontSize: '0.9rem', fontWeight: '800', cursor: 'pointer', marginTop: '10px' }}
                                >
                                    Resend Verification Code
                                </button>
                            )}
                        </form>

                        <div style={{ marginTop: '35px', textAlign: 'center' }}>
                            <Link to="/forgot-password" style={{ fontSize: '0.9rem', color: '#64748b', display: 'block', marginBottom: '18px', fontWeight: '500' }}>Forgot Password?</Link>
                            <p style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '600' }}>
                                New to SkyNestia? <Link to="/register" style={{ color: '#1e40af', fontWeight: '800' }}>Register Now</Link>
                            </p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}
