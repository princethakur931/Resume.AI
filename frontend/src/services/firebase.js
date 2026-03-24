import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics'
import {
  applyActionCode,
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  signInWithPopup
} from 'firebase/auth'
import { getMessaging, getToken, onMessage, isSupported as isMessagingSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
}

const getMissingKeys = () =>
  Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key)

const ensureFirebaseConfig = () => {
  const missingKeys = getMissingKeys()
  if (missingKeys.length) {
    throw new Error(`Missing Firebase config in frontend env: ${missingKeys.join(', ')}`)
  }
}

let app = null
let auth = null
let googleProvider = null
let analyticsInitPromise = null

const getFirebaseApp = () => {
  ensureFirebaseConfig()
  if (!app) {
    app = initializeApp(firebaseConfig)
  }
  return app
}

const getFirebaseAuth = () => {
  if (!auth) {
    auth = getAuth(getFirebaseApp())
  }
  return auth
}

const getGoogleProvider = () => {
  if (!googleProvider) {
    googleProvider = new GoogleAuthProvider()
    googleProvider.setCustomParameters({ prompt: 'select_account' })
  }
  return googleProvider
}

let analytics = null

export const initFirebaseAnalytics = async () => {
  if (typeof window === 'undefined') return null
  if (analytics) return analytics
  if (analyticsInitPromise) return analyticsInitPromise

  analyticsInitPromise = isAnalyticsSupported()
    .then(supported => {
      if (supported) {
        analytics = getAnalytics(getFirebaseApp())
      }
      return analytics
    })
    .catch(() => {
      analytics = null
      return null
    })

  return analyticsInitPromise
}

export { analytics }

export const signInWithGooglePopup = () => {
  return signInWithPopup(getFirebaseAuth(), getGoogleProvider())
}

export const signUpWithEmailPassword = (email, password) => {
  return createUserWithEmailAndPassword(getFirebaseAuth(), email, password)
}

export const signInWithEmailPassword = (email, password) => {
  return signInWithEmailAndPassword(getFirebaseAuth(), email, password)
}

export const sendVerificationEmailToUser = user => {
  const continueUrl = `${window.location.origin}/auth/action`
  return sendEmailVerification(user, { url: continueUrl, handleCodeInApp: false })
}

export const updateFirebaseProfileName = (user, displayName) => {
  return updateProfile(user, { displayName })
}

export const signOutFirebase = () => {
  return signOut(getFirebaseAuth())
}

export const applyEmailVerificationCode = code => {
  return applyActionCode(getFirebaseAuth(), code)
}

export const getFirebaseIdToken = async user => user.getIdToken()

let messaging = null
let messagingInitPromise = null

export const initFirebaseMessaging = async () => {
  if (typeof window === 'undefined') return null
  if (messaging) return messaging
  if (messagingInitPromise) return messagingInitPromise

  messagingInitPromise = isMessagingSupported()
    .then(async supported => {
      if (!supported) {
        console.warn('Firebase Messaging not supported in this browser')
        return null
      }

      try {
        messaging = getMessaging(getFirebaseApp())
        
        // Request notification permission
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          console.warn('Notification permission denied')
          return null
        }

        return messaging
      } catch (error) {
        console.error('Failed to initialize Firebase Messaging:', error)
        return null
      }
    })
    .catch(error => {
      console.error('Error in Firebase Messaging init:', error)
      return null
    })

  return messagingInitPromise
}

export const getFirebaseMessagingToken = async () => {
  try {
    await initFirebaseMessaging()
    if (!messaging) return null

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
    })
    return token
  } catch (error) {
    console.error('Failed to get messaging token:', error)
    return null
  }
}

export const onFirebaseMessageReceived = (callback) => {
  try {
    if (!messaging) {
      console.warn('Messaging not initialized')
      return null
    }

    return onMessage(messaging, (payload) => {
      console.log('Message received:', payload)
      callback(payload)
    })
  } catch (error) {
    console.error('Error setting up message listener:', error)
    return null
  }
}
