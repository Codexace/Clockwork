// Firebase initialisation. All config comes from VITE_FIREBASE_* env vars
// (see .env.example). The Realtime Database instance is exported for use by
// the rtdb action layer.
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// True only when the essential keys are present. The UI shows a friendly
// setup screen instead of crashing when env vars are missing.
export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.databaseURL,
);

let db = null;
if (firebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
}

export { db };
