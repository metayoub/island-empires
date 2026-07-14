self.addEventListener('push', (event) => {
  const payload = event.data?.json?.() ?? {};
  const title = payload.title || 'Island Empires';
  const options = {
    body: payload.body || 'A new notification is available.',
    data: payload.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/notifications'));
});
