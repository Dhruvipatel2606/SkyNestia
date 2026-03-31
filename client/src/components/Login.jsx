import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API from '../api'

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
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
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
        }
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
        <div className="card auth-card">
            <h2>Welcome Back</h2>
            <p className="muted">Sign in to your <span className="brand-font">SkyNestia</span> account</p>


            <form onSubmit={handleSubmit} className="form">
                {!requires2FA ? (
                    <>
                        <label>
                            Username or Email
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                placeholder="john.doe"
                                disabled={isLoading}
                            />
                        </label>
                        <label>
                            Password
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                disabled={isLoading}
                            />
                        </label>
                    </>
                ) : (
                    <label>
                        Two-Factor Authentication
                        <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px', lineHeight: '1.4'}}>
                            {twoFactorMessage}
                        </p>
                        <input
                            type="text"
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value)}
                            required
                            placeholder="000000"
                            style={{textAlign: 'center', fontSize: '1.5rem', letterSpacing: '5px', border: '2px solid var(--secondary-color)', borderRadius: '10px', width: '100%'}}
                            disabled={isLoading}
                            autoFocus
                        />
                        {(twoFactorMethod === 'email' || twoFactorMethod === 'sms') && (
                            <button 
                                type="button"
                                onClick={handleResendOTP} 
                                disabled={isLoading} 
                                style={{background: 'none', border: 'none', color: 'var(--secondary-color)', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', textAlign: 'left', width: 'fit-content'}}
                            >
                                Didn't receive code? Resend
                            </button>
                        )}
                    </label>
                )}

                {error && <div className="error" style={{marginTop: '10px'}}>{error}</div>}
                {infoMessage && <div className="success" style={{marginTop: '10px', color: '#28a745', fontSize: '0.9rem', fontWeight: 'bold'}}>{infoMessage}</div>}

                <button className="btn primary" type="submit" disabled={isLoading} style={{marginTop: '10px'}}>
                    {isLoading ? (requires2FA ? 'Verifying...' : 'Signing in...') : (requires2FA ? 'Verify & Sign In' : 'Sign In')}
                </button>
            </form>

            <div className="footer-note" style={{marginTop: '15px'}}>
                <Link to="/forgot-password" style={{display: 'block', marginBottom: '10px'}}>Forgot Password?</Link>
                Don't have an account? <Link to="/register">Create one</Link>
            </div>
        </div>
    )
}
