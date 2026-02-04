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
import SavedPosts from './components/SavedPosts'

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
          <Route path="/" element={<Login setUser={setUser} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Login setUser={setUser} />} />
          <Route path="/feed" element={user ? <Feed /> : <Login setUser={setUser} />} />
          <Route path="/chat" element={user ? <Chat /> : <Login setUser={setUser} />} />
          <Route path="/create-post" element={user ? <CreatePost /> : <Login setUser={setUser} />} />
          <Route path="/profile/:id" element={user ? <Profile /> : <Login setUser={setUser} />} />
          <Route path="/profile" element={user ? <Profile /> : <Login setUser={setUser} />} />
          <Route path="/followers/:id" element={user ? <Followers /> : <Login setUser={setUser} />} />
          <Route path="/tag-requests" element={user ? <TagRequests /> : <Login setUser={setUser} />} />
          <Route path="/saved" element={user ? <SavedPosts /> : <Login setUser={setUser} />} />
          <Route path="/post/:id" element={user ? <PostDetails /> : <Login setUser={setUser} />} />

        </Routes>
      </main>
    </div>
  )
}
