
import { initializeApp, getApps } from 'firebase/app';

import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage
} from 'firebase/messaging';

import { portal } from './portalApi';

import {
  firebaseConfig,
  pushConfigured,
  vapidKey
} from './pushConfig';

import workerUrl from './studentPushWorker.js?worker&url';

// ======================================================
// CONFIGURATION
// ======================================================

const tokenKey = 'hia-student-push-token';
const appName = 'student-push';

let workerRegistrationPromise = null;

// ======================================================
// FIREBASE INITIALIZATION
// ======================================================

function messaging() {
  const existingApp = getApps().find(
    app => app.name === appName
  );

  const app =
    existingApp ??
    initializeApp(firebaseConfig, appName);

  return getMessaging(app);
}

// ======================================================
// PERMISSION
// ======================================================

export function pushPermission() {
  return window.Notification?.permission ?? 'unavailable';
}

export const blockedPushMessage =
  'Notifications are blocked for this site. Open site settings, ' +
  'allow notifications, and try again. You can still read messages in the bell.';

// ======================================================
// ERROR HANDLING
// ======================================================

export function studentPushError(error) {
  console.error('[Student Push] Error:', error);

  if (
    pushPermission() === 'denied' ||
    error?.code === 'messaging/permission-blocked'
  ) {
    return blockedPushMessage;
  }

  if (error?.code === 'PUSH_UNAVAILABLE') {
    return 'Browser push notifications are unavailable on this device.';
  }

  if (error?.code === 'PUSH_DISMISSED') {
    return 'Please allow notifications and try again.';
  }

  return 'Could not update browser notifications. Try again. You can still read messages in the bell.';
}

// ======================================================
// LOCAL SUBSCRIPTION STATUS
// ======================================================

export function hasPushSubscription() {
  return (
    pushPermission() === 'granted' &&
    Boolean(localStorage.getItem(tokenKey))
  );
}

// ======================================================
// FIREBASE SUPPORT
// ======================================================

async function checkPushSupport() {
  if (
    !pushConfigured ||
    !vapidKey ||
    !window.isSecureContext ||
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    throw Object.assign(
      new Error('Push notifications unavailable'),
      { code: 'PUSH_UNAVAILABLE' }
    );
  }

  if (!(await isSupported())) {
    throw Object.assign(
      new Error('Firebase Messaging is unsupported'),
      { code: 'PUSH_UNAVAILABLE' }
    );
  }
}

// ======================================================
// CUSTOM SERVICE WORKER
// ======================================================

async function registerPushWorker() {
  if (workerRegistrationPromise) {
    return workerRegistrationPromise;
  }

  workerRegistrationPromise = (async () => {
    const registration =
      await navigator.serviceWorker.register(
        workerUrl,
        { type: 'module' }
      );

    if (!registration.active ||
        registration.active.state !== 'activated') {

      const worker =
        registration.installing ??
        registration.waiting ??
        registration.active;

      if (!worker) {
        throw new Error('Push service worker unavailable.');
      }

      await new Promise((resolve, reject) => {
        const check = () => {
          if (
            registration.active?.state === 'activated'
          ) {
            worker.removeEventListener(
              'statechange',
              check
            );
            resolve();
          } else if (worker.state === 'redundant') {
            worker.removeEventListener(
              'statechange',
              check
            );
            reject(
              new Error('Service worker activation failed.')
            );
          }
        };

        worker.addEventListener('statechange', check);
        check();
      });
    }

    console.log(
      '[Student Push] Worker active:',
      registration.scope
    );

    return registration;
  })();

  try {
    return await workerRegistrationPromise;
  } catch (error) {
    workerRegistrationPromise = null;
    throw error;
  }
}

// ======================================================
// ENABLE STUDENT PUSH
// ======================================================

export async function enableStudentPush() {
  await checkPushSupport();

  const permission =
    pushPermission() === 'default'
      ? await Notification.requestPermission()
      : pushPermission();

  if (permission !== 'granted') {
    throw Object.assign(
      new Error('Notification permission not granted'),
      {
        code:
          permission === 'denied'
            ? 'messaging/permission-blocked'
            : 'PUSH_DISMISSED'
      }
    );
  }

  const registration = await registerPushWorker();

  const token = await getToken(messaging(), {
    vapidKey,
    serviceWorkerRegistration: registration
  });

  if (!token) {
    throw new Error('Firebase returned an empty token.');
  }

  // Save token to Spring Boot first.
  await portal('/student-push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ token })
  });

  localStorage.setItem(tokenKey, token);

  console.log(
    '[Student Push] Subscription successful'
  );

  return true;
}

// ======================================================
// DISABLE STUDENT PUSH
// ======================================================

export async function disableStudentPush() {
  const token = localStorage.getItem(tokenKey);

  if (!token) return;

  // Unsubscribe from the academy backend first.
  await portal('/student-push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ token })
  });

  localStorage.removeItem(tokenKey);

  // We deliberately do not use Firebase's undocumented
  // messaging.swRegistration property.
  //
  // The backend has stopped sending to this token.
  // Browser-level token deletion can be added separately
  // with a supported registration lifecycle.

  console.log(
    '[Student Push] Backend subscription removed'
  );
}

// ======================================================
// FOREGROUND PUSH NOTIFICATIONS
// ======================================================

export async function listenForPush(callback) {
  if (!pushConfigured || !(await isSupported())) {
    return () => {};
  }

  const unsubscribe = onMessage(
    messaging(),
    async payload => {

      console.log(
        '[Student Push] Foreground FCM received',
        payload.messageId
      );

      if (typeof callback === 'function') {
        try {
          await callback();
        } catch (error) {
          console.warn(
            '[Student Push] Dashboard refresh failed',
            error
          );
        }
      }

      if (!hasPushSubscription()) return;

      const title =
        payload.data?.title ||
        payload.notification?.title ||
        'Hajara Ilm Academy';

      const body =
        payload.data?.body ||
        payload.notification?.body ||
        'You have a new announcement.';

      try {
        const registration =
          await registerPushWorker();

        await registration.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: payload.messageId || undefined,
          data: {
            url: '/student'
          }
        });

        console.log(
          '[Student Push] Foreground notification displayed'
        );

      } catch (error) {
        console.error(
          '[Student Push] Foreground notification failed',
          error
        );
      }
    }
  );

  return unsubscribe;
}
