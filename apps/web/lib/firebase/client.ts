import { getApps, initializeApp, type FirebaseApp } from "firebase/app";

let clientApp: FirebaseApp | null = null;

export function getFirebaseClientApp() {
  if (clientApp) {
    return clientApp;
  }

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  if (!config.apiKey || !config.projectId) {
    return null;
  }

  clientApp = getApps()[0] ?? initializeApp(config);
  return clientApp;
}
