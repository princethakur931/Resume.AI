import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './components/Landing/Landing'
import Login from './components/Auth/Login'
import Register from './components/Auth/Register'
import AuthAction from './components/Auth/AuthAction'
import Dashboard from './components/Dashboard/Dashboard'
import JobsBoard from './components/Jobs/JobsBoard'
import AdminJobsSecret from './components/Jobs/AdminJobsSecret'
import ProfilePage from './components/Profile/ProfilePage'

const adminSecretPath = import.meta.env.VITE_ADMIN_SECRET_PATH || '/admin'

function StartupLoader() {
  return (
    <div className="startup-loader">
      <div className="startup-loader-bg" />
      <div className="startup-loader-content">
        <div className="startup-loader-logo-wrap">
          <img src="/Resume.AI.jpeg" alt="Resume.AI" className="startup-loader-logo" />
          <div className="startup-loader-ring" aria-hidden="true" />
        </div>
        <p className="startup-loader-title">Resume.AI</p>
        <p className="startup-loader-subtitle">Booting your AI workspace...</p>
        <div className="startup-loader-bar">
          <span className="startup-loader-bar-fill" />
        </div>
      </div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return !user ? children : <Navigate to="/dashboard" replace />
}

function AdminSecretRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return user.role === 'admin' ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  const isAdminRoute = window.location.pathname === adminSecretPath
  const [showStartupLoader, setShowStartupLoader] = useState(!isAdminRoute)

  useEffect(() => {
    if (!isAdminRoute) {
      const timer = setTimeout(() => setShowStartupLoader(false), 2800)
      return () => clearTimeout(timer)
    }
  }, [isAdminRoute])

  if (showStartupLoader) return <StartupLoader />

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/auth/action" element={<AuthAction />} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/jobs" element={<PrivateRoute><JobsBoard /></PrivateRoute>} />
          <Route path={adminSecretPath} element={<AdminSecretRoute><AdminJobsSecret /></AdminSecretRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
