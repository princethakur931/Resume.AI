import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { registerNotificationToken, clearNotificationToken } from '../services/notifications'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const stored = localStorage.getItem('user')
    if (token && stored) {
      try {
        setUser(JSON.parse(stored))
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        // Register notification token when restoring session
        registerNotificationToken().catch(err => {
          console.error('Failed to register notification token:', err)
        })
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        // Recover from malformed cached auth payloads instead of crashing the app.
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        delete api.defaults.headers.common['Authorization']
      }
    }
    setLoading(false)
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(userData)
    // Register notification token after login
    registerNotificationToken().catch(err => {
      console.error('Failed to register notification token:', err)
    })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
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
