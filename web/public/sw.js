/* Service worker for Web Push */
self.addEventListener('push', function (event) {
  let payload = { title: 'BetRollover', body: '', url: null };
  try {
    if (event.data) payload = event.data.json();
  } catch (_) {}
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: payload.url || payload.link || '/' },
  };
  event.waitUntil(self.registration.showNotification(payload.title || 'BetRollover', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
