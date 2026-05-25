import { initializeApp, getApps } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { browserLocalPersistence, getAuth, indexedDBLocalPersistence, initializeAuth, setPersistence } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { isNativeAppShell } from "./app-shell";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Inițializare sigură pentru Next.js
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const firebaseApp = app;
const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

if (typeof window !== "undefined" && recaptchaSiteKey && !window.__keluniaAppCheckInitialized) {
  const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

  if (!isLocalHost) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    window.__keluniaAppCheckInitialized = true;
  }
}

function isNativeShell() {
  return isNativeAppShell();
}

function createAuth() {
  if (typeof window === "undefined") {
    return getAuth(app);
  }

  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const cloudFunctions = getFunctions(app, "europe-west1");
export const storage = getStorage(app);

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

export function ensureAuthPersistence() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  const nativeShell = isNativeShell();
  const persistence = nativeShell ? indexedDBLocalPersistence : browserLocalPersistence;

  return withTimeout(
    setPersistence(auth, persistence),
    3000,
    "Persistenta autentificarii nu a raspuns la timp."
  ).catch((error) => {
    console.warn("Persistenta autentificarii nu a putut fi setata:", error);

    if (nativeShell) {
      return withTimeout(
        setPersistence(auth, browserLocalPersistence),
        3000,
        "Persistenta alternativa nu a raspuns la timp."
      ).catch((fallbackError) => {
        console.warn("Persistenta alternativa nu a putut fi setata:", fallbackError);
      });
    }
  });
}

let firestoreDb;

if (typeof window !== "undefined") {
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    firestoreDb = getFirestore(app);
  }
} else {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
