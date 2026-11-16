export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FCM_API_KEY,
  projectId: import.meta.env.VITE_FCM_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FCM_SENDER_ID,
  appId: import.meta.env.VITE_FCM_APP_ID,
};

export const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
export const pushConfigured = Boolean(vapidKey && Object.values(firebaseConfig).every(Boolean));
