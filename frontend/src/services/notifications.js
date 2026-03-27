import { getFirebaseMessagingToken, onFirebaseMessageReceived } from './firebase'
import api from './api'

let foregroundUnsubscribe = null
let notificationTokenRetryTimer = null
let notificationTokenRetryCount = 0
let devNotificationSkipLogged = false
let badgeListenerBound = false
let badgeAutoClearBound = false

const MAX_NOTIFICATION_TOKEN_RETRIES = 3
const APP_BADGE_STORAGE_KEY = 'resume_ai_unread_badge_count'
const MAX_APP_BADGE_COUNT = 999

const serviceWorkerFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

const hasValidServiceWorkerFirebaseConfig = [
  serviceWorkerFirebaseConfig.apiKey,
  serviceWorkerFirebaseConfig.authDomain,
  serviceWorkerFirebaseConfig.projectId,
  serviceWorkerFirebaseConfig.messagingSenderId,
  serviceWorkerFirebaseConfig.appId
].every(Boolean)

export const getServiceWorkerScriptUrl = () => {
  if (!hasValidServiceWorkerFirebaseConfig) return '/sw.js'

  const params = new URLSearchParams({
    apiKey: serviceWorkerFirebaseConfig.apiKey,
    authDomain: serviceWorkerFirebaseConfig.authDomain,
    projectId: serviceWorkerFirebaseConfig.projectId,
    storageBucket: serviceWorkerFirebaseConfig.storageBucket || '',
    messagingSenderId: serviceWorkerFirebaseConfig.messagingSenderId,
    appId: serviceWorkerFirebaseConfig.appId,
    measurementId: serviceWorkerFirebaseConfig.measurementId || ''
  })

  return `/sw.js?${params.toString()}`
}

export const syncFirebaseConfigToServiceWorker = registration => {
  if (!registration?.active || !hasValidServiceWorkerFirebaseConfig) return

  registration.active.postMessage({
    type: 'INIT_FIREBASE',
    payload: serviceWorkerFirebaseConfig
  })
}

const normalizeBadgeCount = value => {
  const parsed = Number.parseInt(String(value ?? 0), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.min(parsed, MAX_APP_BADGE_COUNT)
}

const canUseLocalStorage = () => {
  if (typeof window === 'undefined') return false
  try {
    return typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

const canUseAppBadgeApi = () => {
  if (typeof navigator === 'undefined') return false
  return typeof navigator.setAppBadge === 'function' && typeof navigator.clearAppBadge === 'function'
}

const readStoredBadgeCount = () => {
  if (!canUseLocalStorage()) return 0
  try {
    return normalizeBadgeCount(window.localStorage.getItem(APP_BADGE_STORAGE_KEY) || 0)
  } catch {
    return 0
  }
}

const writeStoredBadgeCount = count => {
  if (!canUseLocalStorage()) return
  try {
    if (count > 0) {
      window.localStorage.setItem(APP_BADGE_STORAGE_KEY, String(count))
    } else {
      window.localStorage.removeItem(APP_BADGE_STORAGE_KEY)
    }
  } catch {
    // Ignore storage errors in restrictive browser contexts.
  }
}

const notifyServiceWorkerBadgeSync = async count => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.getRegistration('/')
    const target = navigator.serviceWorker.controller || registration?.active
    if (!target) return

    target.postMessage({
      type: 'SYNC_BADGE_COUNT',
      payload: { count: normalizeBadgeCount(count) }
    })
  } catch {
    // Best-effort sync to worker.
  }
}

const applyAppBadgeCount = async count => {
  const normalized = normalizeBadgeCount(count)
  writeStoredBadgeCount(normalized)

  if (!canUseAppBadgeApi()) return normalized

  try {
    if (normalized > 0) {
      await navigator.setAppBadge(normalized)
    } else {
      await navigator.clearAppBadge()
    }
  } catch {
    // Unsupported platforms should silently fallback.
  }

  return normalized
}

export const setAppUnreadBadgeCount = async (count, options = {}) => {
  const { syncServiceWorker = false } = options
  const normalized = await applyAppBadgeCount(count)
  if (syncServiceWorker) {
    await notifyServiceWorkerBadgeSync(normalized)
  }
  return normalized
}

export const incrementAppUnreadBadgeCount = async (step = 1, options = {}) => {
  const increment = Math.max(1, Number.parseInt(String(step), 10) || 1)
  const nextCount = normalizeBadgeCount(readStoredBadgeCount() + increment)
  return setAppUnreadBadgeCount(nextCount, options)
}

export const clearAppUnreadBadgeCount = async (options = {}) => {
  const { syncServiceWorker = true } = options
  return setAppUnreadBadgeCount(0, { syncServiceWorker })
}

const bindServiceWorkerBadgeListener = () => {
  if (badgeListenerBound) return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.addEventListener('message', event => {
    const message = event.data || {}
    if (message.type !== 'BADGE_COUNT_UPDATED') return

    const count = message.payload?.count ?? 0
    applyAppBadgeCount(count)
  })

  badgeListenerBound = true
}

const bindBadgeAutoClear = () => {
  if (badgeAutoClearBound) return
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const clearIfVisible = () => {
    if (document.visibilityState === 'visible') {
      clearAppUnreadBadgeCount({ syncServiceWorker: true })
    }
  }

  window.addEventListener('focus', clearIfVisible)
  document.addEventListener('visibilitychange', clearIfVisible)
  badgeAutoClearBound = true
}

export const initializeNotificationBadging = () => {
  bindServiceWorkerBadgeListener()
  bindBadgeAutoClear()
  applyAppBadgeCount(readStoredBadgeCount())
}

const scheduleNotificationTokenRetry = () => {
  if (!import.meta.env.PROD) return
  if (notificationTokenRetryCount >= MAX_NOTIFICATION_TOKEN_RETRIES) return
  if (notificationTokenRetryTimer) return

  notificationTokenRetryCount += 1
  notificationTokenRetryTimer = window.setTimeout(() => {
    notificationTokenRetryTimer = null
    registerNotificationToken({ requestPermission: false }).catch(() => {
      // Retry is best-effort; avoid throwing on background attempt.
    })
  }, 2500)
}

const waitForServiceWorkerRegistration = async (timeoutMs = 4000) => {
  if (!import.meta.env.PROD) return null
  if (!('serviceWorker' in navigator)) return null

  let existing = await navigator.serviceWorker.getRegistration('/')
  if (existing?.active) {
    syncFirebaseConfigToServiceWorker(existing)
    return existing
  }

  if (!existing) {
    try {
      existing = await navigator.serviceWorker.register(getServiceWorkerScriptUrl())
      if (existing?.active) {
        syncFirebaseConfigToServiceWorker(existing)
        return existing
      }
    } catch {
      // Registration can fail in unsupported contexts; wait path below still handles fallback.
    }
  }

  const readyPromise = navigator.serviceWorker.ready
    .then(async () => {
      const readyRegistration = await navigator.serviceWorker.getRegistration('/')
      return readyRegistration || existing || null
    })
    .catch(() => null)

  const timeoutPromise = new Promise(resolve => {
    setTimeout(() => resolve(null), timeoutMs)
  })

  const readyRegistration = await Promise.race([readyPromise, timeoutPromise])
  if (readyRegistration?.active) {
    syncFirebaseConfigToServiceWorker(readyRegistration)
  }

  return readyRegistration
}

const ensureForegroundListener = () => {
  if (foregroundUnsubscribe) return

  foregroundUnsubscribe = onFirebaseMessageReceived(payload => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const title = payload?.notification?.title || 'New Job Alert'
    const body = payload?.notification?.body || 'A new job posting is available'
    const data = payload?.data || {}

    const notificationIcon = payload?.data?.companyImage || payload?.notification?.icon || '/pwa-192.png';
    const notification = new Notification(title, {
      body,
      icon: notificationIcon,
      tag: payload?.notification?.tag || 'new-job'
    })

    notification.onclick = () => {
      const target = data.jobId ? `/jobs?jobId=${data.jobId}` : '/jobs'
      window.location.assign(target)
      notification.close()
    }

    incrementAppUnreadBadgeCount(1, { syncServiceWorker: true })
  })
}

/**
 * Request notification permission and register token with backend
 */
export const registerNotificationToken = async (options = {}) => {
  try {
    const { requestPermission = true } = options

    if (!import.meta.env.PROD) {
      if (!devNotificationSkipLogged) {
        console.log('Push notification token registration is disabled in development')
        devNotificationSkipLogged = true
      }
      return false
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('Notifications not supported in this browser')
      return false
    }

    let permission = Notification.permission
    if (permission === 'default' && requestPermission) {
      permission = await Notification.requestPermission()
    }

    if (permission !== 'granted') {
      if (permission === 'default' && !requestPermission) {
        console.log('Notification permission prompt skipped during silent registration')
      } else {
        console.log('Notification permission not granted')
      }
      return false
    }

    let registration = null
    if ('serviceWorker' in navigator) {
      registration = await waitForServiceWorkerRegistration()
      if (!registration) {
        console.log('Service worker not active yet; skipping token registration for now')
        scheduleNotificationTokenRetry()
        return false
      }
    }

    // Get Firebase messaging token
    const token = await getFirebaseMessagingToken(registration)
    if (!token) {
      console.log('Could not get messaging token')
      return false
    }

    console.log('FCM Token:', token)

    // Send token to backend
    const response = await api.post('/auth/notification-token', { token })
    console.log('Token registered with backend:', response.data)

    notificationTokenRetryCount = 0

    if (notificationTokenRetryTimer) {
      clearTimeout(notificationTokenRetryTimer)
      notificationTokenRetryTimer = null
    }

    ensureForegroundListener()
    
    return true
  } catch (error) {
    console.error('Error registering notification token:', error)
    return false
  }
}

/**
 * Clear notification token (used on logout)
 */
export const clearNotificationToken = async () => {
  try {
    if (!import.meta.env.PROD) return
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    let registration = null
    if ('serviceWorker' in navigator) {
      registration = await waitForServiceWorkerRegistration()
      if (!registration) {
        console.log('Service worker not active; skip token removal')
        return
      }
    }

    const tokenToRemove = (await getFirebaseMessagingToken(registration)) || ''

    if (!tokenToRemove) {
      console.log('No current device notification token to remove')
      return
    }

    await api.post('/auth/notification-token', { token: tokenToRemove, action: 'remove' })
    console.log('Current device notification token removed')
  } catch (error) {
    console.error('Error clearing notification token:', error)
  }
}
