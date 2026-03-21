import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD
  ? 'https://resume-ai-j24l.onrender.com/api'
  : '/api')

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 120000
})

export const authWithFirebase = ({ idToken, name, profilePhoto }) =>
  api.post('/auth/firebase', { idToken, name, profilePhoto })

// Attach token on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const requestUrl = err.config?.url || ''
      const isAuthRequest = /\/auth\/(login|register|firebase)$/.test(requestUrl)

      // Let auth screens handle invalid credentials/provider setup errors.
      if (!isAuthRequest) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
