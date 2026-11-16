import { initializeApp, getApps } from 'firebase/app';
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { portal } from './portalApi';
import { firebaseConfig, pushConfigured, vapidKey } from './pushConfig';
import workerUrl from './studentPushWorker.js?worker&url';

const tokenKey = 'hia-student-push-token';
const appName = 'student-push';

function messaging() {
  const app = getApps().find(candidate => candidate.name === appName);
  return getMessaging(app ?? initializeApp(firebaseConfig, appName));
}

export function pushPermission() {
  return window.Notification?.permission ?? 'unavailable';
}

export const blockedPushMessage = 'Notifications are blocked for this site. Open the site controls next to the address bar, set Notifications to Allow, then return here and tap Enable notifications. You can still read academy messages in the bell.';

export function studentPushError(error) {
  if (pushPermission() === 'denied' || error.code === 'messaging/permission-blocked')
    return blockedPushMessage;
  if (error.code === 'PUSH_UNAVAILABLE')
    return 'Browser notifications are unavailable here. On iPhone, install the app from Safari and open it from your Home Screen.';
  if (error.code === 'PUSH_DISMISSED')
    return 'Tap Enable notifications again and choose Allow when your browser asks.';
  return 'Could not update browser notifications. Try again in a moment. You can still read messages in the bell.';
}

export function hasPushSubscription() {
  return pushPermission() === 'granted' && Boolean(localStorage.getItem(tokenKey));
}

export async function enableStudentPush() {
  if (!pushConfigured || !window.isSecureContext || !('Notification' in window)
      || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw Object.assign(new Error(), { code: 'PUSH_UNAVAILABLE' });
  }
  const permission = pushPermission() === 'default' ? await Notification.requestPermission() : pushPermission();
  if (permission !== 'granted')
    throw Object.assign(new Error(), { code: permission === 'denied' ? 'messaging/permission-blocked' : 'PUSH_DISMISSED' });
  if (!await isSupported()) throw Object.assign(new Error(), { code: 'PUSH_UNAVAILABLE' });
  const registration = await navigator.serviceWorker.register(workerUrl, { type: "module" });
  const worker = registration.installing ?? registration.waiting;
  if (worker && worker.state !== 'activated') {
    await new Promise((resolve, reject) => {
      function check() {
        if (worker.state === 'activated') resolve();
        if (worker.state === 'redundant') reject(new Error('Could not start notifications.'));
      }
      worker.addEventListener('statechange', check);
      check();
    });
  }
  const token = await getToken(messaging(), { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error('Could not register this browser for push notifications.');
  await portal('/student-push/subscribe', { method: 'POST', body: JSON.stringify({ token }) });
  localStorage.setItem(tokenKey, token);
}

export async function disableStudentPush() {
  const token = localStorage.getItem(tokenKey);
  if (!token) return;
  await portal('/student-push/unsubscribe', { method: 'POST', body: JSON.stringify({ token }) });
  localStorage.removeItem(tokenKey);
  if (pushConfigured && await isSupported()) await deleteToken(messaging());
}

export async function listenForPush(callback) {
  if (!pushConfigured || !await isSupported()) return () => {};
  return onMessage(messaging(), payload => {
    callback();
    if (!hasPushSubscription()) return;
    const title = payload.data?.title;
    const message = payload.data?.body;
    const body = title && message ? `${title}\n${message}` : payload.notification?.body;
    if (!body) return;
    navigator.serviceWorker.register(workerUrl, { type: 'module' })
      .then(registration => registration.showNotification('Hajara Ilm Academy', {
        body, icon: '/icon-192.png', silent: false,
      }))
      .catch(() => { /* The dashboard still shows the received message. */ });
  });
}
