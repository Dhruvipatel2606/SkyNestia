import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API from '../api'

export default function Login({ setUser }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)
        const usernameTrim = (username || '').trim()

        try {
            const res = await API.post('/auth/login', { username: usernameTrim, password });
            const data = res.data;

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

    return (
        <div className="card auth-card">
            <h2>Welcome Back</h2>
            <p className="muted">Sign in to your <span className="brand-font">SkyNestia</span> account</p>


            <form onSubmit={handleSubmit} className="form">
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

                {error && <div className="error">{error}</div>}

                <button className="btn primary" type="submit" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
            </form>

            <div className="footer-note" style={{marginTop: '15px'}}>
                <Link to="/forgot-password" style={{display: 'block', marginBottom: '10px'}}>Forgot Password?</Link>
                Don't have an account? <Link to="/register">Create one</Link>
            </div>
        </div>
    )
}
