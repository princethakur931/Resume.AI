import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { getServiceWorkerScriptUrl, syncFirebaseConfigToServiceWorker } from './services/notifications'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    navigator.serviceWorker.register(getServiceWorkerScriptUrl())
      .then(registration => {
        syncFirebaseConfigToServiceWorker(registration)
        return navigator.serviceWorker.ready
      })
      .then(readyRegistration => {
        syncFirebaseConfigToServiceWorker(readyRegistration)
      })
      .catch(() => {
        // Ignore registration errors to avoid blocking app startup.
      })
  } else {
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
