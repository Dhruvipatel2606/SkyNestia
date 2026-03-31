import React, { useEffect, useState } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Login from './components/Login'
import Register from './components/Register'
import ForgotPassword from './components/ForgotPassword'
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
import Settings from './components/Settings'
import YourActivity from './components/YourActivity'
import AdminLayout from './components/Admin/AdminLayout'
import AdminOverview from './components/Admin/AdminOverview'
import AdminUsers from './components/Admin/AdminUsers'
import AdminVerifications from './components/Admin/AdminVerifications'
import AdminPosts from './components/Admin/AdminPosts'
import AdminReports from './components/Admin/AdminReports'
import AdminAnalytics from './components/Admin/AdminAnalytics'
import { SocketProvider } from './SocketContext'
import useAppUsageTracker from './utils/useAppUsageTracker'
import Reels from './pages/Reels/Reels'
import Search from './components/Search'
import Explore from './components/Explore'
import ScreenTimeProvider from './providers/ScreenTimeProvider'
import ScreenTimeWarningBanner from './components/screenTime/ScreenTimeWarningBanner'
import ScreenTimeLockScreen from './components/screenTime/ScreenTimeLockScreen'
import useScreenTime from './hooks/useScreenTime'
import Logo from './components/Logo'

/* Screen Time Guard — renders lock screen or warning banners */
function ScreenTimeGuard({ children }) {
  const { isBlocked, warningLevel, isEnabled } = useScreenTime();

  return (
    <>
      {isBlocked && <ScreenTimeLockScreen />}
      {isEnabled && !isBlocked && (warningLevel === 'soft' || warningLevel === 'hard') && (
        <ScreenTimeWarningBanner />
      )}
      {children}
    </>
  );
}

/* Wrapper that provides the regular sidebar + main layout */
function AppLayout({ user, setUser, sidebarOpen, setSidebarOpen, children }) {
  return (
    <>
      {user && <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />}
      <main className="main" style={{
        marginLeft: !user ? 0 : (sidebarOpen ? '240px' : '70px'),
        width: !user ? '100%' : (sidebarOpen ? 'calc(100% - 240px)' : 'calc(100% - 70px)'),
        justifyContent: !user ? 'center' : 'flex-start',
        transition: 'margin-left 0.3s ease, width 0.3s ease'
      }}>
        {children}
      </main>
    </>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  useAppUsageTracker(!!user);

  const isAdminRoute = location.pathname.startsWith('/admin');

  // Restore session and theme
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('user') || localStorage.getItem('user')
      if (raw) setUser(JSON.parse(raw))
      
      const savedTheme = localStorage.getItem('theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
    } catch (e) { console.error('Failed to parse user session/theme', e) }
  }, [])

  return (
    <SocketProvider userId={user?._id}>
      <ScreenTimeProvider isAuthenticated={!!user}>
        <div className="app" style={isAdminRoute ? { background: 'none' } : {}}>
          <ScreenTimeGuard>
            <Routes>
              {/* ──── Admin Routes (own layout, no regular sidebar) ──── */}
              <Route path="/admin" element={user ? <AdminLayout /> : <Login setUser={setUser} />}>
                <Route index element={<AdminOverview />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="posts" element={<AdminPosts />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="verifications" element={<AdminVerifications />} />
                <Route path="analytics" element={<AdminAnalytics />} />
              </Route>

              {/* ──── Regular App Routes (with sidebar) ──── */}
              <Route path="/*" element={
                <AppLayout user={user} setUser={setUser} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                  <Routes>
                    <Route path="/" element={<Login setUser={setUser} />} />
                    <Route path="/login" element={<Login setUser={setUser} />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/dashboard" element={user ? <Dashboard /> : <Login setUser={setUser} />} />
                    <Route path="/feed" element={user ? <Feed /> : <Login setUser={setUser} />} />
                    <Route path="/chat" element={user ? <Chat /> : <Login setUser={setUser} />} />
                    <Route path="/create-post" element={user ? <CreatePost /> : <Login setUser={setUser} />} />
                    <Route path="/profile/:id" element={user ? <Profile /> : <Login setUser={setUser} />} />
                    <Route path="/profile" element={user ? <Profile /> : <Login setUser={setUser} />} />
                    <Route path="/followers/:id" element={user ? <Followers /> : <Login setUser={setUser} />} />
                    <Route path="/tag-requests" element={user ? <TagRequests /> : <Login setUser={setUser} />} />
                    <Route path="/saved" element={user ? <SavedPosts /> : <Login setUser={setUser} />} />
                    <Route path="/settings" element={user ? <Settings /> : <Login setUser={setUser} />} />
                    <Route path="/post/:id" element={user ? <PostDetails /> : <Login setUser={setUser} />} />
                    <Route path="/reels" element={user ? <Reels /> : <Login setUser={setUser} />} />
                    <Route path="/activity" element={user ? <YourActivity /> : <Login setUser={setUser} />} />
                    <Route path="/search" element={user ? <Search /> : <Login setUser={setUser} />} />
                    <Route path="/explore" element={user ? <Explore /> : <Login setUser={setUser} />} />
                  </Routes>
                </AppLayout>
              } />
            </Routes>
          </ScreenTimeGuard>
        </div>
      </ScreenTimeProvider>
    </SocketProvider>
  )
}

