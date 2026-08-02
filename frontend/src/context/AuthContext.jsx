import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { registerNotificationToken, clearNotificationToken } from '../services/notifications'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restoreSession = async () => {
      // Try to restore session via httpOnly cookie (no localStorage token needed)
      const stored = localStorage.getItem('user')

      try {
        // Validate session with backend — cookie is sent automatically
        const { data } = await api.get('/auth/me')
        if (data?.user) {
          localStorage.setItem('user', JSON.stringify(data.user))
          setUser(data.user)
        }

        // Register notification token when restoring session
        registerNotificationToken({ requestPermission: false }).catch(err => {
          console.error('Failed to register notification token:', err)
        })
      } catch {
        // Cookie invalid/expired — clear local cache
        localStorage.removeItem('user')
        // Also clear any legacy token from old localStorage approach
        localStorage.removeItem('token')
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()

    return () => {}
  }, [])

  const login = (token, userData) => {
    // token is still returned in body for backward compat, but we rely on httpOnly cookie now
    // Store only non-sensitive user data in localStorage for quick UI render
    localStorage.setItem('user', JSON.stringify(userData))
    // Remove any legacy token from localStorage
    localStorage.removeItem('token')
    setUser(userData)
    // Register notification token after login
    registerNotificationToken({ requestPermission: true }).catch(err => {
      console.error('Failed to register notification token:', err)
    })
  }

  const logout = async () => {
    try {
      // Tell backend to clear the httpOnly cookie
      await api.post('/auth/logout')
    } catch {
      // Ignore errors — proceed with local cleanup anyway
    }
    localStorage.removeItem('user')
    localStorage.removeItem('token')  // Clear any legacy token
    setUser(null)
    // Clear notification token on logout
    clearNotificationToken().catch(err => {
      console.error('Failed to clear notification token:', err)
    })
  }

  const updateUser = userData => {
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    return {
      user: null,
      loading: false,
      login: () => {},
      logout: () => {},
      updateUser: () => {}
    }
  }
  return context
}
