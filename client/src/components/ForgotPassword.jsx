import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../api';

export default function ForgotPassword() {
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);
        try {
            const res = await API.post('/auth/forgot-password', { email });
            setMessage(res.data.message || 'OTP sent to your email.');
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP. Please check your email.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);
        try {
            const res = await API.post('/auth/verify-otp', { email, otp });
            setMessage(res.data.message || 'OTP verified successfully.');
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired OTP.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);
        try {
            const res = await API.post('/auth/reset-password', { email, otp, newPassword });
            setMessage(res.data.message || 'Password reset successfully.');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card auth-card">
            <h2>Reset Password</h2>
            <p className="muted">Recover access to your <span className="brand-font">SkyNestia</span> account</p>

            {message && <div style={{ color: 'green', marginBottom: '10px' }}>{message}</div>}
            {error && <div className="error">{error}</div>}

            {step === 1 && (
                <form onSubmit={handleSendOTP} className="form">
                    <label>
                        Email Address
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="john.doe@example.com"
                            disabled={isLoading}
                        />
                    </label>
                    <button className="btn primary" type="submit" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={handleVerifyOTP} className="form">
                    <p style={{fontSize: '0.9rem', marginBottom: '15px'}}>An OTP has been sent to <b>{email}</b></p>
                    <label>
                        6-Digit OTP
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            required
                            placeholder="123456"
                            maxLength={6}
                            disabled={isLoading}
                        />
                    </label>
                    <button className="btn primary" type="submit" disabled={isLoading}>
                        {isLoading ? 'Verifying...' : 'Verify OTP'}
                    </button>
                    <button 
                        className="btn secondary" 
                        type="button" 
                        onClick={() => setStep(1)} 
                        disabled={isLoading}
                        style={{marginTop: '10px'}}
                    >
                        Change Email
                    </button>
                </form>
            )}

            {step === 3 && (
                <form onSubmit={handleResetPassword} className="form">
                    <label>
                        New Password
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            placeholder="••••••"
                            minLength={6}
                            disabled={isLoading}
                        />
                    </label>
                    <button className="btn primary" type="submit" disabled={isLoading}>
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            )}

            <div className="footer-note" style={{marginTop: '20px'}}>
                Remember your password? <Link to="/login">Back to Login</Link>
            </div>
        </div>
    );
}
