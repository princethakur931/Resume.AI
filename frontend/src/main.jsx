import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // Register the main PWA service worker for caching / offline support
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore registration errors to avoid blocking app startup.
    })

    // Register the dedicated Firebase Messaging service worker.
    // FCM requires a service worker named "firebase-messaging-sw.js" at the root scope
    // to deliver background push notifications when the app is completely closed.
    navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {
      // Non-critical – app still works without background push
    })
  } else {
    // In development: unregister all service workers and clear caches
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(reg => reg.unregister())))
      .catch(() => {})

    if ('caches' in window) {
      caches.keys()
        .then(keys => Promise.all(keys.filter(key => key.startsWith('resume-ai-cache')).map(key => caches.delete(key))))
        .catch(() => {})
    }
  }
}
