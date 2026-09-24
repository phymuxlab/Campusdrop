self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data?.text() || '' }; }
  const title = data.title || 'CampusDrop';
  const options = {
    body: data.body || 'You have a new CampusDrop update.',
    icon: data.icon || '/campusdrop-mark.png',
    badge: data.badge || '/campusdrop-mark.png',
    tag: data.tag || 'campusdrop-notification',
    renotify: true,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        try { await client.navigate(target); } catch {}
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
