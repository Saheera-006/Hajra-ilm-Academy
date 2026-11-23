
import { initializeApp, getApps } from 'firebase/app';
import {
  getMessaging,
  onBackgroundMessage
} from 'firebase/messaging/sw';

import { firebaseConfig } from './pushConfig';

// ======================================================
// FIREBASE INITIALIZATION
// ======================================================

const app =
  getApps().find(app => app.name === '[DEFAULT]') ??
  initializeApp(firebaseConfig);

const messaging = getMessaging(app);

// ======================================================
// SERVICE WORKER LIFECYCLE
// ======================================================

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

// ======================================================
// BACKGROUND FCM NOTIFICATIONS
// ======================================================

onBackgroundMessage(messaging, async payload => {
  console.log(
    '[Student Push Worker] Background FCM received',
    payload.messageId
  );

  const title =
    payload.data?.title ||
    payload.notification?.title ||
    'Hajara Ilm Academy';

  const body =
    payload.data?.body ||
    payload.notification?.body ||
    'You have a new announcement.';

  try {
    await self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.messageId || undefined,
      data: {
        url: '/student'
      }
    });

    console.log(
      '[Student Push Worker] Notification displayed'
    );

  } catch (error) {
    console.error(
      '[Student Push Worker] Notification failed',
      error
    );
  }
});

// ======================================================
// NOTIFICATION CLICK
// ======================================================

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = new URL(
    '/student',
    self.location.origin
  ).href;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.navigate(targetUrl);
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl);
    })()
  );
});
