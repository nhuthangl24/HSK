import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  measurementId?: string;
}

export function getStoredFirebaseConfig(): FirebaseClientConfig | null {
  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyAb5rRFMel32xjSyix5MCZFFCumV6PfvBc';
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hsks-a320f';

  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'hsks-a320f.firebaseapp.com',
      projectId,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'hsks-a320f.firebasestorage.app',
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '408971964413',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:408971964413:web:9afccbcaf6392b4b96b394',
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-FCRGDPQY27',
    };
  }

  return null;
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export function getFirebaseServices(): {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  isConfigured: boolean;
} {
  const config = getStoredFirebaseConfig();
  if (!config) {
    return { app: null, db: null, auth: null, isConfigured: false };
  }

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    auth = getAuth(app);
    return { app, db, auth, isConfigured: true };
  } catch (e) {
    console.error('Firebase initialization error:', e);
    return { app: null, db: null, auth: null, isConfigured: false };
  }
}
