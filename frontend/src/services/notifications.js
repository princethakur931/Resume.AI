import { getFirebaseMessagingToken, onFirebaseMessageReceived } from './firebase'
import api from './api'

let foregroundUnsubscribe = null
let notificationTokenRetryTimer = null
let notificationTokenRetryCount = 0
let devNotificationSkipLogged = false

const MAX_NOTIFICATION_TOKEN_RETRIES = 3

// ─── FCM Service Worker Helper ────────────────────────────────────────────────
//
// FCM requires the FCM token to be tied to a service worker named
// "firebase-messaging-sw.js" at the root scope. This SW is generated at build
// time by vite.config.js with the Firebase config baked in, so it can handle
// background push messages even when the app is completely closed.

const waitForFcmServiceWorker = async (timeoutMs = 6000) => {
  if (!('serviceWorker' in navigator)) return null

  // Try existing registration first
  let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')

  if (registration?.active) return registration

  // Register if not yet registered
  if (!registration) {
    try {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    } catch {
      // Fall through to timeout wait
    }
  }

  if (registration?.active) return registration

  // Wait for the SW to become active
  const readyPromise = new Promise(resolve => {
    if (!registration) { resolve(null); return }

    const sw = registration.installing || registration.waiting
    if (!sw) { resolve(registration.active || null); return }

    sw.addEventListener('statechange', function handler() {
      if (sw.state === 'activated') {
        sw.removeEventListener('statechange', handler)
        resolve(registration)
      }
    })
  })

  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), timeoutMs))

  return Promise.race([readyPromise, timeoutPromise])
}

// ─── Token retry ──────────────────────────────────────────────────────────────

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

// ─── Foreground message listener ─────────────────────────────────────────────

const ensureForegroundListener = () => {
  if (foregroundUnsubscribe) return

  foregroundUnsubscribe = onFirebaseMessageReceived(payload => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const title = payload?.notification?.title || 'New Job Alert'
    const body = payload?.notification?.body || 'A new job posting is available'
    const data = payload?.data || {}

    const notificationIcon = payload?.data?.companyImage || payload?.notification?.icon || '/pwa-192.png'
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
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Request notification permission and register FCM token with backend.
 *
 * The token is tied to firebase-messaging-sw.js so FCM can deliver push
 * notifications even when the app is completely closed.
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

    // Wait for the FCM-specific service worker to be active.
    // This SW handles background push delivery when the app is closed.
    let fcmRegistration = null
    if ('serviceWorker' in navigator) {
      fcmRegistration = await waitForFcmServiceWorker()
      if (!fcmRegistration) {
        console.log('firebase-messaging-sw.js not active yet; scheduling retry')
        scheduleNotificationTokenRetry()
        return false
      }
    }

    // Get Firebase FCM token tied to the firebase-messaging-sw.js registration
    const token = await getFirebaseMessagingToken(fcmRegistration)
    if (!token) {
      console.log('Could not get FCM messaging token – check VITE_FIREBASE_VAPID_KEY is set in Vercel env vars')
      scheduleNotificationTokenRetry()
      return false
    }

    console.log('FCM Token obtained:', token.substring(0, 20) + '...')

    // Send token to backend
    const response = await api.post('/auth/notification-token', { token })
    console.log('FCM token registered with backend:', response.data)

    notificationTokenRetryCount = 0

    if (notificationTokenRetryTimer) {
      clearTimeout(notificationTokenRetryTimer)
      notificationTokenRetryTimer = null
    }

    // Set up foreground listener for when app is open
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

    let fcmRegistration = null
    if ('serviceWorker' in navigator) {
      fcmRegistration = await waitForFcmServiceWorker()
    }

    const tokenToRemove = (await getFirebaseMessagingToken(fcmRegistration)) || ''

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
