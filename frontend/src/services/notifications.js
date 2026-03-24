import { getFirebaseMessagingToken } from './firebase'
import { apiClient } from './api'

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

    // Check if service worker is registered (required for push notifications)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        console.log('Service Worker registered:', registration)
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    // Get Firebase messaging token
    const token = await getFirebaseMessagingToken()
    if (!token) {
      console.log('Could not get messaging token')
      return false
    }

    console.log('FCM Token:', token)

    // Send token to backend
    const response = await apiClient.post('/auth/notification-token', { token })
    console.log('Token registered with backend:', response.data)
    
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
    await apiClient.post('/auth/notification-token', { token: '' })
    console.log('Notification token cleared')
  } catch (error) {
    console.error('Error clearing notification token:', error)
  }
}
