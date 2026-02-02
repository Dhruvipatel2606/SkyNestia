import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import Feed from './components/Feed'
import CreatePost from './components/CreatePost'
import Chat from './components/Chat/Chat'
import Profile from './components/Profile'
import Followers from './components/Followers'
import TagRequests from './components/TagRequests'
import PostDetails from './components/PostDetails'
import Sidebar from './components/Sidebar'

import { useEffect, useState } from 'react'

export default function App() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user')
      if (raw) setUser(JSON.parse(raw))
    } catch (e) { console.error('Failed to parse user from localStorage', e) }
  }, [])

  return (
    <div className="app">
      {user && <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />}
      {!user && (
        <nav className="nav" style={{ justifyContent: 'center', position: 'absolute', width: '100%', background: 'transparent', border: 'none', top: 0 }}>
          <Link to="/" className="logo">SkyNestia</Link>
        </nav>
      )}
      <main className="main" style={{
        marginLeft: !user ? 0 : (sidebarOpen ? '240px' : '70px'),
        width: !user ? '100%' : (sidebarOpen ? 'calc(100% - 240px)' : 'calc(100% - 70px)'),
        justifyContent: !user ? 'center' : 'flex-start',
        transition: 'margin-left 0.3s ease, width 0.3s ease'
      }}>
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
          <Route path="/profile" element={<Profile />} />
          <Route path="/followers/:id" element={<Followers />} />
          <Route path="/tag-requests" element={<TagRequests />} />
          <Route path="/post/:id" element={<PostDetails />} />

        </Routes>
      </main>
    </div>
  )
}
