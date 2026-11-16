import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { firebaseConfig } from './pushConfig';

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(new URL('/student', self.location.origin).href));
});

self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));
const messaging = getMessaging(initializeApp(firebaseConfig));
onBackgroundMessage(messaging, ({ data }) => {
  if (!data?.title || !data?.body) return;
  return self.registration.showNotification('Hajara Ilm Academy', {
    body: `${data.title}\n${data.body}`,
    silent: false,
    icon: new URL('/icon-192.png', self.location.origin).href,
  });
});
