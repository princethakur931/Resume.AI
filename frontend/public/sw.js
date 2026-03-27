importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

const CACHE_NAME = 'resume-ai-cache-v3';
const APP_SHELL = ['/', '/manifest.webmanifest'];

let messagingInitialized = false;
let firebaseConfigReceived = false;
let backgroundUnreadBadgeCount = 0;

const MAX_APP_BADGE_COUNT = 999;

const normalizeBadgeCount = (value) => {
  const parsed = Number.parseInt(String(value ?? 0), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(parsed, MAX_APP_BADGE_COUNT);
};

const supportsWorkerNavigatorBadge = () => {
  try {
    return Boolean(self.navigator && typeof self.navigator.setAppBadge === 'function' && typeof self.navigator.clearAppBadge === 'function');
  } catch {
    return false;
  }
};

const supportsRegistrationBadge = () => {
  return Boolean(self.registration && typeof self.registration.setAppBadge === 'function' && typeof self.registration.clearAppBadge === 'function');
};

const applyWorkerBadgeCount = async (count) => {
  const normalized = normalizeBadgeCount(count);

  try {
    if (supportsWorkerNavigatorBadge()) {
      if (normalized > 0) {
        await self.navigator.setAppBadge(normalized);
      } else {
        await self.navigator.clearAppBadge();
      }
    } else if (supportsRegistrationBadge()) {
      if (normalized > 0) {
        await self.registration.setAppBadge(normalized);
      } else {
        await self.registration.clearAppBadge();
      }
    }
  } catch {
    // Ignore unsupported badging API errors.
  }

  return normalized;
};

const broadcastBadgeCount = async (count) => {
  try {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    clientList.forEach((client) => {
      client.postMessage({
        type: 'BADGE_COUNT_UPDATED',
        payload: { count }
      });
    });
  } catch {
    // No-op if clients API is unavailable.
  }
};

const setWorkerBadgeCount = async (count) => {
  backgroundUnreadBadgeCount = normalizeBadgeCount(count);
  await applyWorkerBadgeCount(backgroundUnreadBadgeCount);
  await broadcastBadgeCount(backgroundUnreadBadgeCount);
  return backgroundUnreadBadgeCount;
};

const incrementWorkerBadgeCount = async (step = 1) => {
  const amount = Math.max(1, Number.parseInt(String(step), 10) || 1);
  return setWorkerBadgeCount(backgroundUnreadBadgeCount + amount);
};

const clearWorkerBadgeCount = async () => {
  return setWorkerBadgeCount(0);
};

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

      return incrementWorkerBadgeCount().then(() =>
        self.registration.showNotification(notificationData.title, {
          body: notificationData.body,
          icon: notificationData.icon,
          badge: '/pwa-192.png',
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
        })
      );
    });

    messagingInitialized = true;
    console.log('[SW] Firebase Messaging initialized for background messages');
  } catch (error) {
    console.warn('[SW] Firebase Messaging init failed:', error.message);
  }
};

self.addEventListener('message', event => {
  const message = event.data || {};
  if (message.type === 'INIT_FIREBASE') {
    const firebaseConfig = message.payload;
    if (!firebaseConfig || typeof firebaseConfig !== 'object') return;

    firebaseConfigReceived = true;
    initializeMessaging(firebaseConfig);
    return;
  }

  if (message.type === 'RESET_BADGE') {
    event.waitUntil(clearWorkerBadgeCount());
    return;
  }

  if (message.type === 'SYNC_BADGE_COUNT') {
    const count = message.payload?.count ?? 0;
    event.waitUntil(setWorkerBadgeCount(count));
  }
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
    Promise.all([
      clearWorkerBadgeCount(),
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
    ])
  );

  notification.close();
});

