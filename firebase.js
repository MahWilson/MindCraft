// Firebase initialization for client and server usage
//
// Environment variables (see .env.example):
// - NEXT_PUBLIC_FIREBASE_API_KEY
// - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
// - NEXT_PUBLIC_FIREBASE_PROJECT_ID
// - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
// - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
// - NEXT_PUBLIC_FIREBASE_APP_ID
//
// Notes:
// - For Sprint 1–2 we use Firebase Web SDK from both client (pages/components)
//   and Next.js API routes for simplicity. For production hardening, consider
//   migrating server-side writes to Firebase Admin SDK + stricter security rules.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize (avoid re-init during hot reloads)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Exports used across app
export const auth = getAuth(app);
export const db = getFirestore(app);

// TODO(security): Enforce RBAC via Firestore Security Rules.
// TODO(env): Ensure .env.local is populated; never commit real keys.

console.log("✅ Connected to Firebase Project:", firebaseConfig.projectId);

