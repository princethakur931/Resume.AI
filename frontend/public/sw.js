importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

const CACHE_NAME = 'resume-ai-cache-v3';
const APP_SHELL = ['/', '/manifest.webmanifest'];

let messagingInitialized = false;
let firebaseConfigReceived = false;

const getFirebaseConfigFromWorkerUrl = () => {
  try {
    const url = new URL(self.location.href);
    const apiKey = url.searchParams.get('apiKey') || '';
    const authDomain = url.searchParams.get('authDomain') || '';
    const projectId = url.searchParams.get('projectId') || '';
    const storageBucket = url.searchParams.get('storageBucket') || '';
    const messagingSenderId = url.searchParams.get('messagingSenderId') || '';
    const appId = url.searchParams.get('appId') || '';
    const measurementId = url.searchParams.get('measurementId') || '';

    if (!apiKey || !authDomain || !projectId || !messagingSenderId || !appId) {
      return null;
    }

    return {
      apiKey,
      authDomain,
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
      measurementId
    };
  } catch {
    return null;
  }
};

// Initialize Firebase Messaging in Service Worker.
// Unlike the window context, SW must initialize Firebase on its own.
const initializeMessaging = (firebaseConfig) => {
  if (messagingInitialized) return;
  
  try {
    if (!firebase.apps || firebase.apps.length === 0) {
      if (!firebaseConfig) {
        return;
      }
      firebase.initializeApp(firebaseConfig);
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
    console.warn('[SW] Firebase Messaging init failed:', error.message);
  }
};

self.addEventListener('message', event => {
  const message = event.data || {};
  if (message.type !== 'INIT_FIREBASE') return;

  const firebaseConfig = message.payload;
  if (!firebaseConfig || typeof firebaseConfig !== 'object') return;

  firebaseConfigReceived = true;
  initializeMessaging(firebaseConfig);
});

const configFromUrl = getFirebaseConfigFromWorkerUrl();
if (configFromUrl) {
  firebaseConfigReceived = true;
  initializeMessaging(configFromUrl);
}

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
    )).then(() => self.clients.claim()).then(() => {
      if (!firebaseConfigReceived) {
        console.log('[SW] Waiting for Firebase config from client');
      }
    })
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

// Fallback push handler for cases where Firebase background callback is not ready
// (for example, after worker restart while app is fully closed).
self.addEventListener('push', event => {
  if (messagingInitialized) {
    // Firebase Messaging handles this path via onBackgroundMessage.
    return;
  }

  if (!event.data) return;

  event.waitUntil((async () => {
    try {
      const payload = event.data.json();
      const notificationPayload = payload?.notification || {};
      const dataPayload = payload?.data || {};

      const title = notificationPayload.title || 'New Job Alert';
      const body = notificationPayload.body || 'A new job posting is available';
      const icon = dataPayload.companyImage || notificationPayload.icon || '/pwa-192.png';
      const tag = notificationPayload.tag || 'new-job';
      const requireInteraction = notificationPayload.requireInteraction === true;

      await self.registration.showNotification(title, {
        body,
        icon,
        tag,
        requireInteraction,
        data: dataPayload,
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
    } catch (error) {
      console.warn('[SW] Push fallback parse/show failed:', error?.message || error);
    }
  })());
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

