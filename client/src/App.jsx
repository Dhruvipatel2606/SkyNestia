import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import Feed from './components/Feed'
import CreatePost from './components/CreatePost'
import Chat from './components/Chat/Chat'
import Profile from './components/Profile'

import { useEffect, useState } from 'react'

export default function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user')
      if (raw) setUser(JSON.parse(raw))
    } catch (e) { console.error('Failed to parse user from localStorage', e) }
  }, [])

  return (
    <div className="app">
      <nav className="nav">
        <Link to="/" className="logo">SkyNestia</Link>
        <div className="nav-actions">
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/feed" className="nav-link">Feed</Link>
              <Link to="/profile" className="nav-link">Profile</Link>
              <Link to="/chat" className="nav-link">Chat</Link>

              <Link to="/create-post" className="nav-link">Create</Link>
              <span className="nav-link" style={{ cursor: 'pointer' }} onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('token'); setUser(null); window.location.href = '/login' }}>Logout</span>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link">Register</Link>
            </>
          )}
        </div>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/create-post" element={<CreatePost />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/profile" element={<Profile />} />

        </Routes>
      </main>
    </div>
  )
}
