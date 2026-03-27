// sw.js – PWA caching / offline service worker
// Background push notifications are handled by firebase-messaging-sw.js (FCM standard).

const CACHE_NAME = 'resume-ai-cache-v4';
const APP_SHELL = ['/', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
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
  if (!event.data) return;

  event.waitUntil((async () => {
    try {
      const payload = event.data.json();
      const nestedFcmPayload = typeof payload?.data?.FCM_MSG === 'string'
        ? JSON.parse(payload.data.FCM_MSG)
        : null;

      const normalizedPayload = nestedFcmPayload || payload;
      const notificationPayload = normalizedPayload?.notification || {};
      const dataPayload = normalizedPayload?.data || {};

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

