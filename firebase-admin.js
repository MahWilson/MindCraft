import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let app;
if (!getApps().length) {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

  if (clientEmail && privateKey && projectId) {
    app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    app = initializeApp({ credential: applicationDefault() });
  }
}

export const adminDb = getFirestore();
export { FieldValue };