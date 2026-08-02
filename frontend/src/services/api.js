import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 120000,
  withCredentials: true  // Send httpOnly cookies with every request (cross-domain)
})

let warmBackendPromise = null

export const warmBackend = () => {
  if (!warmBackendPromise) {
    warmBackendPromise = api
      .get('/health', { timeout: 15000 })
      .catch(() => null)
  }

  return warmBackendPromise
}

export const authWithFirebase = ({ idToken, name, profilePhoto }) =>
  api.post('/auth/firebase', { idToken, name, profilePhoto })

// Handle 401 globally — cookie invalid ya expire ho gayi
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      const requestUrl = err.config?.url || ''
      const isAuthRequest = /\/auth\/(login|register|firebase)$/.test(requestUrl)

      // Let auth screens handle invalid credentials/provider setup errors.
      if (!isAuthRequest) {
        // Clear any legacy localStorage tokens
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
