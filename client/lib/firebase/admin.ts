import admin from 'firebase-admin';

let cachedFirebaseApp: admin.app.App | null = null;

function getFirebaseApp(): admin.app.App {
  if (cachedFirebaseApp) {
    return cachedFirebaseApp;
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Variables Firebase manquantes : NEXT_PUBLIC_FIREBASE_PROJECT_ID, '
      + 'FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY',
    );
  }

  cachedFirebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      // NOTE: La clé privée contient des \n littéraux dans le .env
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  return cachedFirebaseApp;
}

export function getFirestoreClient(): admin.firestore.Firestore {
  return getFirebaseApp().firestore();
}

export function getStorageClient(): admin.storage.Storage {
  return getFirebaseApp().storage();
}
