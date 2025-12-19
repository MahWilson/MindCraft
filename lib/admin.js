import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;
let adminDb = null;

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

try {
  if (!getApps().length) {
    if (clientEmail && privateKey && projectId) {
      app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
      adminDb = getFirestore();
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Only try ADC if explicitly set via env var to avoid crash
      app = initializeApp({ credential: applicationDefault(), projectId });
      adminDb = getFirestore();
    } else {
      // Admin SDK not configured - client-side Firestore will be used instead
      // This is expected in development/client-only mode
    }
  } else {
    app = getApps()[0];
    adminDb = getFirestore();
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
}

export { adminDb };
