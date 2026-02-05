import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameTrim, password })
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setError(data.message || 'Login failed')
                setIsLoading(false)
                return
            }
            // on success - store user and token, then navigate to dashboard
            const data = await res.json().catch(() => ({}))
            if (data.user) {
                sessionStorage.setItem('user', JSON.stringify(data.user))
                if (setUser) setUser(data.user); // Update App state
            }
            if (data.token) {
                sessionStorage.setItem('token', data.token)
            }
            navigate('/feed') // Direct to feed for better UX
        } catch (err) {
            setError('Network error. Please try again.')
            setIsLoading(false)
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

            <div className="footer-note">
                Don't have an account? <Link to="/register">Create one</Link>
            </div>
        </div>
    )
}
