importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

const CACHE_NAME = 'resume-ai-cache-v3';
const APP_SHELL = ['/', '/manifest.webmanifest'];

let messagingInitialized = false;

// Initialize Firebase Messaging in Service Worker
// Firebase is auto-initialized when the main app loads, we just need to get the messaging instance
const initializeMessaging = () => {
  if (messagingInitialized) return;
  
  try {
    if (!firebase.apps || firebase.apps.length === 0) {
      console.log('[SW] Firebase not initialized yet, will retry...');
      return;
    }

    const messaging = firebase.messaging();
    
    // Set up background message handler
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Background message received:', payload);
      
      let notificationData = {
        title: payload?.notification?.title || 'New Job Alert',
        body: payload?.notification?.body || 'A new job posting is available',
        icon: payload?.notification?.icon || '/pwa-192.png',
        tag: payload?.notification?.tag || 'new-job',
        requireInteraction: false,
        data: payload?.data || {}
      };

      // Use company image as main icon if available
      if (payload?.data?.companyImage) {
        notificationData.icon = payload.data.companyImage;
      }

      return self.registration.showNotification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon,
        badge: notificationData.badge,
        tag: notificationData.tag,
        requireInteraction: notificationData.requireInteraction,
        data: notificationData.data,
        actions: [
          {
            action: 'open',
            title: 'Open Job'
          },
          {
            action: 'close',
            title: 'Close'
          }
        ]
      });
    });

    messagingInitialized = true;
    console.log('[SW] Firebase Messaging initialized for background messages');
  } catch (error) {
    console.warn('[SW] Firebase Messaging init delayed:', error.message);
    // Retry after a short delay
    setTimeout(initializeMessaging, 1000);
  }
};

// Try to initialize messaging immediately and periodically
initializeMessaging();
setInterval(() => {
  if (!messagingInitialized) initializeMessaging();
}, 2000);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match('/'));
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  const notification = event.notification;
  const data = notification.data || {};

  if (event.action === 'close') {
    notification.close();
    return;
  }

  // For any other action or click, open the app and navigate to jobs/job details
  let urlToOpen = '/jobs';
  if (data.jobId) {
    urlToOpen = `/jobs?jobId=${data.jobId}`;
  } else {
    urlToOpen = '/jobs';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const sameOriginClient = clientList.find(client => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      if (sameOriginClient && 'focus' in sameOriginClient) {
        return sameOriginClient.focus().then(() => {
          if ('navigate' in sameOriginClient) {
            return sameOriginClient.navigate(urlToOpen);
          }
          return null;
        });
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }

      return null;
    })
  );

  notification.close();
});

