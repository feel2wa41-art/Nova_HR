// Service Worker for Web Push Notifications
const CACHE_NAME = 'nova-hr-v1';
const STATIC_CACHE = [
  '/',
  '/icons/icon-192x192.png',
  '/icons/badge-72x72.png',
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);

  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[SW] Push data:', data);

    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/badge-72x72.png',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction !== false,
      silent: data.silent === true,
      timestamp: data.timestamp || Date.now(),
      tag: data.data?.type || 'default',
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  } catch (error) {
    console.error('[SW] Error processing push event:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('Nova HR 알림', {
        body: '새로운 알림이 도착했습니다.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: { fallback: true },
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);
  
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  let url = '/';

  // Determine URL based on notification data
  if (data.type === 'APPROVAL_REQUEST' && data.referenceId) {
    if (action === 'approve') {
      url = `/approval/quick-action?token=${data.approvalToken}&action=approve&draftId=${data.referenceId}`;
    } else {
      url = `/approval/detail/${data.referenceId}`;
    }
  } else if (data.type === 'ATTENDANCE_EXCEPTION') {
    url = '/attendance';
  } else if (data.type === 'DOCUMENT_NOTIFICATION') {
    url = '/approval/inbox';
  } else if (data.type === 'HR_COMMUNITY_POST' && data.referenceId) {
    url = `/community/posts/${data.referenceId}`;
  } else if (data.type === 'HR_COMMUNITY_COMMENT' && data.referenceId) {
    url = `/community/posts/${data.referenceId}`;
  } else if (data.type === 'HR_COMMUNITY_LIKE' && data.referenceId) {
    url = `/community/posts/${data.referenceId}`;
  } else if (data.referenceType && data.referenceId) {
    // Generic mapping based on reference type
    switch (data.referenceType) {
      case 'approval':
        url = `/approval/detail/${data.referenceId}`;
        break;
      case 'attendance':
        url = '/attendance';
        break;
      case 'attitude':
        url = '/attitude';
        break;
      case 'community':
        url = `/community/posts/${data.referenceId}`;
        break;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing tab
      for (const client of clientList) {
        if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open new tab
      if (clients.openWindow) {
        const fullUrl = new URL(url, self.location.origin).href;
        return clients.openWindow(fullUrl);
      }
    })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification);
  
  // Track notification dismissal analytics if needed
  const data = event.notification.data || {};
  if (data.trackDismissal) {
    // Send analytics event
    console.log('[SW] Tracking notification dismissal for:', data.type);
  }
});

// Message event - handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Send response back
  event.ports[0].postMessage({ success: true });
});

// Background sync (if needed in the future)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Perform background sync tasks
      Promise.resolve()
    );
  }
});

console.log('[SW] Service worker loaded');