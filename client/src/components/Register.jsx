import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function Register() {
    const [firstname, setFirstname] = useState('')
    const [lastname, setLastname] = useState('')
    const [username, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (password !== confirm) {
            setError('Passwords do not match')
            return
        }

        // Username validation
        const usernameRegex = /^[a-zA-Z0-9._]{3,20}$/;
        if (!usernameRegex.test(username)) {
            setError('Username must be 3-20 characters long and can only contain letters, numbers, underscores, and dots.');
            return
        }

        const emailTrim = (email || '').trim()
        const gmailRe = /^[A-Za-z0-9._%+-]+@gmail\.com$/i
        if (!gmailRe.test(emailTrim)) {
            setError('Please enter a valid @gmail.com address')
            return
        }

        setIsLoading(true)

        try {
            const res = await fetch('/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email: emailTrim, password, firstname, lastname })
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                setError(data.message || 'Registration failed')
                setIsLoading(false)
                return
            }
            navigate('/login')
        } catch (err) {
            setError('Network error. Please try again.')
            setIsLoading(false)
        }
    }

    return (
        <div className="card auth-card">
            <h2>Create Account</h2>
            <p className="muted">Join <span className="brand-font">SkyNestia</span> today</p>


            <form onSubmit={handleSubmit} className="form">
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                        <label>First Name</label>
                        <input value={firstname} onChange={(e) => setFirstname(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label>Last Name</label>
                        <input value={lastname} onChange={(e) => setLastname(e.target.value)} disabled={isLoading} />
                    </div>
                </div>

                <label>
                    Username
                    <input value={username} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
                </label>

                <label>
                    Email Address
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
                </label>

                <label>
                    Password
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} disabled={isLoading} />
                </label>

                <label>
                    Confirm Password
                    <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} disabled={isLoading} />
                </label>

                {error && <div className="error">{error}</div>}

                <button className="btn primary" type="submit" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Sign Up'}
                </button>
            </form>

            <div className="footer-note">
                Already have an account? <Link to="/login">Sign in</Link>
            </div>
        </div>
    )
}
