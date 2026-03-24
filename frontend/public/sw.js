const CACHE_NAME = 'resume-ai-cache-v3';
const APP_SHELL = ['/', '/manifest.webmanifest'];

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

// Handle push notifications
self.addEventListener('push', event => {
  if (!event.data) return;

  let parsedData = {};
  let notificationData = {
    title: 'New Job Alert',
    body: 'A new job posting is available',
    icon: '/job-icon.jpg',
    badge: '/job-icon.jpg',
    tag: 'new-job',
    requireInteraction: false
  };

  try {
    parsedData = event.data.json();
    if (parsedData.notification) {
      notificationData = { ...notificationData, ...parsedData.notification };
    }
  } catch (error) {
    // If it's not JSON, use the text as the body
    notificationData.body = event.data.text();
  }

  const pushPromise = self.registration.showNotification(notificationData.title, {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    data: parsedData.data || {},
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

  event.waitUntil(pushPromise);
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
  let urlToOpen = '/';
  if (data.jobId) {
    urlToOpen = `/?jobId=${data.jobId}`;
  } else {
    urlToOpen = '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Check if app is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );

  notification.close();
});

