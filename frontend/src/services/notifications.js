import { getFirebaseMessagingToken, onFirebaseMessageReceived } from './firebase'
import api from './api'

let foregroundUnsubscribe = null

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
      window.open(target, '_blank')
      notification.close()
    }
  })
}

/**
 * Request notification permission and register token with backend
 */
export const registerNotificationToken = async () => {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('Notifications not supported in this browser')
      return false
    }

    let registration = null

    // Check if service worker is registered (required for push notifications)
    if ('serviceWorker' in navigator) {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        console.log('Service Worker registered:', registration)
      } catch (error) {
        console.error('Service Worker registration failed:', error)
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
    let tokenToRemove = ''
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration('/')
      tokenToRemove = (await getFirebaseMessagingToken(registration)) || ''
    }

    if (!tokenToRemove) {
      // Fallback to previous behavior when current device token cannot be resolved.
      await api.post('/auth/notification-token', { token: '' })
      console.log('Notification tokens cleared')
      return
    }

    await api.post('/auth/notification-token', { token: tokenToRemove, action: 'remove' })
    console.log('Current device notification token removed')
  } catch (error) {
    console.error('Error clearing notification token:', error)
  }
}
