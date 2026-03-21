import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics'
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup
} from 'firebase/auth'

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

export const buildRecaptcha = containerId => {
  const firebaseAuth = getFirebaseAuth()

  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear()
    window.recaptchaVerifier = null
  }

  window.recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: 'invisible'
  })

  return window.recaptchaVerifier
}

export const requestPhoneOtp = async phoneNumber => {
  ensureFirebaseConfig()
  const appVerifier = buildRecaptcha('recaptcha-container')
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier)
}

export const getFirebaseIdToken = async user => user.getIdToken()
