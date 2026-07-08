import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously, type Auth } from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Database | undefined;

function getFirebaseApp(): FirebaseApp {
  if (!app) app = initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

export function getFirebaseDb(): Database {
  if (!dbInstance) dbInstance = getDatabase(getFirebaseApp());
  return dbInstance;
}

export function ensureSignedIn(): Promise<string> {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsubscribe();
          resolve(user.uid);
        }
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
    signInAnonymously(auth).catch((error: unknown) => {
      unsubscribe();
      reject(error);
    });
  });
}
